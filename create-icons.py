from PIL import Image, ImageDraw, ImageFont
import os

def create_icons():
    # Ensure icons directory exists
    icons_dir = os.path.join(os.getcwd(), 'icons')
    if not os.path.exists(icons_dir):
        os.makedirs(icons_dir)

    sizes = [16, 48, 128]

    # Colors
    bg_color_top = (52, 152, 219) # Blue
    bg_color_bottom = (41, 128, 185) # Darker Blue
    text_color = (255, 255, 255)

    for size in sizes:
        # Create new image with alpha channel
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        # Draw gradient background (vertical)
        for y in range(size):
            r = int(bg_color_top[0] + (bg_color_bottom[0] - bg_color_top[0]) * y / size)
            g = int(bg_color_top[1] + (bg_color_bottom[1] - bg_color_top[1]) * y / size)
            b = int(bg_color_top[2] + (bg_color_bottom[2] - bg_color_top[2]) * y / size)
            draw.line([(0, y), (size, y)], fill=(r, g, b, 255))

        # Draw a simple "D" or book shape
        # Safe simpler approach: White textual "D" centered
        try:
            # Try to load a default font, otherwise default to simple logic
            # For 16px, simple pixel art might be better, but let's try drawing

            if size >= 16:
                 # Draw a simple rectangle representing a book/card
                 margin = int(size * 0.2)
                 draw.rectangle(
                     [margin, margin, size - margin, size - margin],
                     outline=text_color,
                     width=max(1, int(size * 0.05))
                 )
                 # Add a detail line
                 draw.line(
                     [size//2, margin, size//2, size-margin],
                     fill=text_color,
                     width=max(1, int(size * 0.05))
                 )

        except Exception as e:
            print(f"Drawing error for size {size}: {e}")

        # Save file
        filename = os.path.join(icons_dir, f'icon{size}.png')
        img.save(filename)
        print(f"Generated {filename}")

if __name__ == "__main__":
    create_icons()