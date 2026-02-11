#!/usr/bin/env python3
"""
Fix image URLs in the events JSON file.
Converts Wikipedia/Wikimedia Commons page URLs to direct image URLs.
"""
import json
import re
import urllib.parse

def fix_image_url(url):
    """Convert Wikipedia/Commons page URLs to direct image URLs."""
    if not url or not isinstance(url, str):
        return ""
    
    url = url.strip()
    
    # Handle empty or malformed URLs
    if not url:
        return ""
    
    # Check if URL contains multiple URLs (malformed)
    # Split by excessive whitespace and take the first valid URL
    if "                " in url or "\n" in url:
        parts = re.split(r'\s{4,}|\n', url)
        url = parts[0].strip()
    
    # Remove trailing slashes and numbers that shouldn't be there
    url = re.sub(r'/\d+$', '', url)
    
    # Already a direct image URL
    if 'upload.wikimedia.org' in url:
        return url
    
    # Handle Wikimedia Commons wiki page URLs
    if 'commons.wikimedia.org/wiki/File:' in url:
        # Extract the filename
        match = re.search(r'File:([^#?]+)', url)
        if match:
            filename = match.group(1)
            # Decode URL encoding
            filename = urllib.parse.unquote(filename)
            # Encode for URL
            filename_encoded = urllib.parse.quote(filename.replace(' ', '_'))
            
            # Get first letter of filename for directory structure
            first_char = filename[0]
            # Calculate MD5 hash-based path (simplified - just use first 2 chars as approximation)
            # Note: This is a simplification. Real Wikimedia URLs use MD5 hash of filename
            # For now, we'll construct a search URL or keep original
            
            # Return a Commons page URL that redirects to image
            return f"https://commons.wikimedia.org/wiki/Special:FilePath/{filename_encoded}"
    
    # Handle Wikipedia URLs with #/media/File:
    if '#/media/File:' in url or '/media/File:' in url:
        # Extract the filename
        match = re.search(r'(?:#/media/|/media/)File:([^#?]+)', url)
        if match:
            filename = match.group(1)
            # Decode URL encoding
            filename = urllib.parse.unquote(filename)
            # Encode for URL
            filename_encoded = urllib.parse.quote(filename.replace(' ', '_'))
            
            # Use Special:FilePath which redirects to the actual image
            return f"https://commons.wikimedia.org/wiki/Special:FilePath/{filename_encoded}"
    
    # Handle direct Wikipedia file URLs
    if 'en.wikipedia.org/wiki/File:' in url:
        match = re.search(r'File:([^#?]+)', url)
        if match:
            filename = match.group(1)
            filename = urllib.parse.unquote(filename)
            filename_encoded = urllib.parse.quote(filename.replace(' ', '_'))
            return f"https://commons.wikimedia.org/wiki/Special:FilePath/{filename_encoded}"
    
    # Handle other Wikipedia image references
    if 'wikipedia.org' in url and 'File:' in url:
        match = re.search(r'File:([^#?]+)', url)
        if match:
            filename = match.group(1)
            filename = urllib.parse.unquote(filename)
            filename_encoded = urllib.parse.quote(filename.replace(' ', '_'))
            return f"https://commons.wikimedia.org/wiki/Special:FilePath/{filename_encoded}"
    
    # If it's a direct image URL from other sources, keep it
    if any(ext in url.lower() for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']):
        return url
    
    # If we can't convert it, return empty string
    return ""

def main():
    input_file = 'static/events-files/racism-events3.json'
    output_file = 'static/events-files/racism-events3.json.backup'
    
    # Use UTF-8 for console output on Windows
    import sys
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8')
    
    print(f"Reading {input_file}...")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        events = json.load(f)
    
    # Backup original file
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(events, f, ensure_ascii=False, indent=2)
    print(f"Backup saved to {output_file}")
    
    # Fix image URLs
    fixed_count = 0
    for event in events:
        if 'image_url' in event:
            original_url = event['image_url']
            fixed_url = fix_image_url(original_url)
            
            if fixed_url != original_url:
                event['image_url'] = fixed_url
                fixed_count += 1
                try:
                    print(f"\nFixed: {event.get('title', 'Unknown')}")
                    print(f"  From: {original_url[:100]}...")
                    print(f"  To:   {fixed_url[:100]}...")
                except UnicodeEncodeError:
                    print(f"\nFixed event (title contains special characters)")
                    print(f"  From: {original_url[:100]}...")
                    print(f"  To:   {fixed_url[:100]}...")
    
    # Save fixed file
    with open(input_file, 'w', encoding='utf-8') as f:
        json.dump(events, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ Fixed {fixed_count} image URLs")
    print(f"✓ Saved to {input_file}")
    print(f"✓ Original backed up to {output_file}")

if __name__ == '__main__':
    main()
