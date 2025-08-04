from PIL import Image

img = Image.open("logo.png")
sizes = [72, 96, 128, 144, 152, 192, 384, 512] # Desired square sizes

for size in sizes:
    resized_img = img.resize((size, size))
    resized_img.save(f"icon_{size}x{size}.png")