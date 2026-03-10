#!/usr/bin/env python3
"""
Meridian Blog Publisher
-----------------------
Reads .md files from this directory and publishes them to WordPress
via the REST API. Tracks what's been published so it never double-posts.

Usage:
    python publish.py                  # Publish next unpublished post as DRAFT
    python publish.py --publish        # Publish next unpublished post as LIVE
    python publish.py --all            # Publish ALL unpublished posts as drafts
    python publish.py --all --publish  # Publish ALL unpublished posts as LIVE
    python publish.py --dry-run        # Preview what would be published
    python publish.py --list           # Show published/unpublished status
"""

import os
import sys
import json
import glob
import re
import base64
import argparse
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

# ─── CONFIGURATION ───────────────────────────────────────────────────────────

WP_SITE = os.environ.get("WP_SITE", "")
WP_USER = os.environ.get("WP_USER", "")
WP_APP_PASSWORD = os.environ.get("WP_APP_PASSWORD", "")

if not all([WP_SITE, WP_USER, WP_APP_PASSWORD]):
    print("Error: Set WP_SITE, WP_USER, and WP_APP_PASSWORD environment variables.")
    sys.exit(1)

# Blog post category (create this in WP admin if it doesn't exist)
WP_CATEGORY_NAME = "Blog"

# Where to track published state
TRACKING_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".published.json")
BLOG_DIR = os.path.dirname(os.path.abspath(__file__))

# ─── HELPERS ─────────────────────────────────────────────────────────────────

MEDIA_CACHE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".media-cache.json")


def get_auth_header():
    """Create Basic Auth header from credentials."""
    creds = f"{WP_USER}:{WP_APP_PASSWORD}"
    encoded = base64.b64encode(creds.encode()).decode()
    return f"Basic {encoded}"


def wp_api(endpoint, method="GET", data=None):
    """Make a WordPress REST API request."""
    url = f"{WP_SITE}/wp-json/wp/v2/{endpoint}"
    headers = {
        "Authorization": get_auth_header(),
        "Content-Type": "application/json",
        "User-Agent": "Meridian-Blog-Publisher/1.0",
    }

    body = json.dumps(data).encode() if data else None
    req = Request(url, data=body, headers=headers, method=method)

    try:
        with urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except HTTPError as e:
        error_body = e.read().decode()
        print(f"  ✗ API error {e.code}: {error_body[:300]}")
        return None
    except URLError as e:
        print(f"  ✗ Connection error: {e.reason}")
        return None


def load_media_cache():
    """Load the media cache mapping local filenames to WP URLs."""
    if os.path.exists(MEDIA_CACHE_FILE):
        with open(MEDIA_CACHE_FILE) as f:
            return json.load(f)
    return {}


def save_media_cache(cache):
    """Save the media cache."""
    with open(MEDIA_CACHE_FILE, "w") as f:
        json.dump(cache, f, indent=2)


def upload_image(filepath):
    """Upload an image file to the WordPress media library. Returns the WP URL."""
    filename = os.path.basename(filepath)
    mime_types = {
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }
    ext = os.path.splitext(filename)[1].lower()
    content_type = mime_types.get(ext, "application/octet-stream")

    with open(filepath, "rb") as f:
        file_data = f.read()

    url = f"{WP_SITE}/wp-json/wp/v2/media"
    headers = {
        "Authorization": get_auth_header(),
        "Content-Type": content_type,
        "Content-Disposition": f'attachment; filename="{filename}"',
        "User-Agent": "Meridian-Blog-Publisher/1.0",
    }

    req = Request(url, data=file_data, headers=headers, method="POST")

    try:
        with urlopen(req) as resp:
            result = json.loads(resp.read().decode())
            return result.get("source_url", "")
    except HTTPError as e:
        error_body = e.read().decode()
        print(f"    ✗ Image upload failed for {filename}: {e.code} {error_body[:200]}")
        return None
    except URLError as e:
        print(f"    ✗ Image upload connection error for {filename}: {e.reason}")
        return None


def resolve_images(html, post_dir):
    """Find local image references in HTML, upload them to WP, and replace with WP URLs."""
    media_cache = load_media_cache()
    img_pattern = re.compile(r'<img\s+src="(assets/[^"]+)"([^>]*)>')

    def replace_match(match):
        local_path = match.group(1)
        extra_attrs = match.group(2)
        filename = os.path.basename(local_path)

        # Check cache first
        if filename in media_cache:
            wp_url = media_cache[filename]
            print(f"    Image (cached): {filename} → {wp_url}")
            return f'<img src="{wp_url}"{extra_attrs}>'

        # Upload to WP
        full_path = os.path.join(post_dir, local_path)
        if not os.path.exists(full_path):
            print(f"    ✗ Image not found: {full_path}")
            return match.group(0)

        print(f"    Uploading image: {filename}...")
        wp_url = upload_image(full_path)
        if wp_url:
            media_cache[filename] = wp_url
            save_media_cache(media_cache)
            print(f"    ✓ Image uploaded: {filename} → {wp_url}")
            return f'<img src="{wp_url}"{extra_attrs}>'
        else:
            return match.group(0)

    resolved = img_pattern.sub(replace_match, html)
    return resolved


def load_tracking():
    """Load the tracking file of published posts."""
    if os.path.exists(TRACKING_FILE):
        with open(TRACKING_FILE) as f:
            return json.load(f)
    return {}


def save_tracking(data):
    """Save the tracking file."""
    with open(TRACKING_FILE, "w") as f:
        json.dump(data, f, indent=2)


def parse_markdown(filepath):
    """Parse a blog post markdown file into title, subtitle, HTML body, and optional metadata."""
    with open(filepath) as f:
        content = f.read()

    lines = content.strip().split("\n")
    meta = {}

    # Check for YAML frontmatter (between --- delimiters)
    body_content = content
    if lines[0].strip() == "---":
        end_idx = None
        for i in range(1, len(lines)):
            if lines[i].strip() == "---":
                end_idx = i
                break
        if end_idx:
            for line in lines[1:end_idx]:
                if ":" in line:
                    key, val = line.split(":", 1)
                    meta[key.strip()] = val.strip().strip('"').strip("'")
            body_content = "\n".join(lines[end_idx + 1:])

    lines = body_content.strip().split("\n")

    # Extract title from first H1
    title = meta.get("title", "")
    subtitle = ""
    body_start = 0

    for i, line in enumerate(lines):
        if line.startswith("# ") and not title:
            title = line[2:].strip()
            body_start = i + 1
            continue
        if line.startswith("*") and line.endswith("*") and not subtitle and i == body_start:
            subtitle = line.strip("* ")
            body_start = i + 1
            continue
        if line.strip() == "---" and i <= body_start + 1:
            body_start = i + 1
            continue

    body_lines = lines[body_start:]
    body_md = "\n".join(body_lines).strip()

    # Convert markdown to basic HTML
    html = md_to_html(body_md)

    return title, subtitle, html, meta


def md_to_html(md):
    """Convert markdown to HTML (basic conversion, no external deps)."""
    lines = md.split("\n")
    html_lines = []
    in_list = False
    in_paragraph = False
    paragraph_buffer = []

    def flush_paragraph():
        nonlocal in_paragraph, paragraph_buffer
        if paragraph_buffer:
            text = " ".join(paragraph_buffer)
            text = inline_format(text)
            html_lines.append(f"<p>{text}</p>")
            paragraph_buffer = []
            in_paragraph = False

    def inline_format(text):
        # Bold
        text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
        # Italic
        text = re.sub(r'\*(.+?)\*', r'<em>\1</em>', text)
        # Images (before links, since ![...](...) would match link pattern)
        text = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', r'<img src="\2" alt="\1">', text)
        # Links
        text = re.sub(r'\[(.+?)\]\((.+?)\)', r'<a href="\2">\1</a>', text)
        # Inline code
        text = re.sub(r'`(.+?)`', r'<code>\1</code>', text)
        return text

    for line in lines:
        stripped = line.strip()

        # Empty line — flush paragraph
        if not stripped:
            flush_paragraph()
            if in_list:
                html_lines.append("</ul>")
                in_list = False
            continue

        # Headings
        if stripped.startswith("## "):
            flush_paragraph()
            heading_text = inline_format(stripped[3:])
            html_lines.append(f"<h2>{heading_text}</h2>")
            continue
        if stripped.startswith("### "):
            flush_paragraph()
            heading_text = inline_format(stripped[4:])
            html_lines.append(f"<h3>{heading_text}</h3>")
            continue

        # Horizontal rule
        if stripped == "---":
            flush_paragraph()
            html_lines.append("<hr/>")
            continue

        # Unordered list
        if stripped.startswith("- ") or stripped.startswith("* "):
            flush_paragraph()
            if not in_list:
                html_lines.append("<ul>")
                in_list = True
            item_text = inline_format(stripped[2:])
            html_lines.append(f"<li>{item_text}</li>")
            continue

        # Regular paragraph text
        paragraph_buffer.append(stripped)
        in_paragraph = True

    flush_paragraph()
    if in_list:
        html_lines.append("</ul>")

    return "\n".join(html_lines)


def get_blog_files():
    """Get all numbered blog post markdown files, sorted."""
    pattern = os.path.join(BLOG_DIR, "[0-9]*.md")
    files = sorted(glob.glob(pattern))
    return files


def get_or_create_category():
    """Get the Blog category ID, creating it if needed."""
    cats = wp_api(f"categories?search={WP_CATEGORY_NAME}&per_page=10")
    if cats:
        for cat in cats:
            if cat["name"].lower() == WP_CATEGORY_NAME.lower():
                return cat["id"]

    # Create it
    result = wp_api("categories", method="POST", data={"name": WP_CATEGORY_NAME})
    if result:
        return result["id"]
    return None


def generate_slug(filename):
    """Generate a URL slug from the filename."""
    name = Path(filename).stem
    # Remove leading numbers and dashes
    slug = re.sub(r'^\d+-', '', name)
    return slug


# ─── MAIN ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Publish Meridian blog posts to WordPress")
    parser.add_argument("--publish", action="store_true", help="Publish as live (default: draft)")
    parser.add_argument("--all", action="store_true", help="Publish all unpublished posts")
    parser.add_argument("--dry-run", action="store_true", help="Preview without publishing")
    parser.add_argument("--list", action="store_true", help="List published/unpublished status")
    args = parser.parse_args()

    tracking = load_tracking()
    blog_files = get_blog_files()

    if not blog_files:
        print("No blog post files found (looking for [0-9]*.md)")
        return

    # ── LIST MODE ──
    if args.list:
        print(f"\n  Meridian Blog — {len(blog_files)} posts found\n")
        for f in blog_files:
            name = Path(f).name
            status = tracking.get(name, {})
            if status:
                state = status.get("status", "?")
                wp_id = status.get("wp_id", "?")
                print(f"  ✓ {name}  →  {state} (ID: {wp_id})")
            else:
                print(f"  · {name}  →  unpublished")
        print()
        return

    # ── FIND UNPUBLISHED POSTS ──
    unpublished = [f for f in blog_files if Path(f).name not in tracking]

    if not unpublished:
        print("All posts are already published!")
        return

    to_publish = unpublished if args.all else [unpublished[0]]

    print(f"\n  Publishing {len(to_publish)} post(s)...\n")

    # Get category
    if not args.dry_run:
        cat_id = get_or_create_category()

    for filepath in to_publish:
        filename = Path(filepath).name
        title, subtitle, html_body, meta = parse_markdown(filepath)
        slug = generate_slug(filename)
        status = "publish" if args.publish else "draft"

        # If a date is set in frontmatter and it's in the future, use "future" status
        publish_date = meta.get("date", "")

        print(f"  {'[DRY RUN] ' if args.dry_run else ''}Publishing: {title}")
        print(f"    Slug: {slug}")
        print(f"    Status: {status}")
        if publish_date:
            print(f"    Scheduled: {publish_date}")
        print(f"    Words: ~{len(html_body.split())}")

        if args.dry_run:
            print(f"    Preview: {html_body[:150]}...")
            print()
            continue

        # Upload local images to WP and replace URLs
        html_body = resolve_images(html_body, BLOG_DIR)

        # Build the post payload
        post_data = {
            "title": title,
            "content": html_body,
            "status": status,
            "slug": slug,
            "excerpt": subtitle,
            "format": "standard",
        }

        # If a future date is specified, schedule the post
        if publish_date and args.publish:
            post_data["date"] = publish_date
            post_data["status"] = "future"

        if cat_id:
            post_data["categories"] = [cat_id]

        result = wp_api("posts", method="POST", data=post_data)

        if result and "id" in result:
            wp_id = result["id"]
            wp_link = result.get("link", "")
            print(f"    ✓ Published! ID: {wp_id}")
            print(f"    → {wp_link}")

            tracking[filename] = {
                "wp_id": wp_id,
                "status": status,
                "link": wp_link,
                "title": title,
            }
            save_tracking(tracking)
        else:
            print(f"    ✗ Failed to publish")

        print()

    print("  Done.\n")


if __name__ == "__main__":
    main()
