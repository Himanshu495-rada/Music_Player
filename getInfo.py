import os
import json
from mutagen.mp3 import MP3
from mutagen.id3 import ID3, APIC, TIT2, TPE1, TALB
from PIL import Image
import io

audio_folder = "assets/audio"
cover_folder = "assets/cover"
cdnPath = "https://pub-c403363b2b11447bb27eb2c6cbcc103d.r2.dev"
coverCdnPath = "https://pub-19bd45b041d041579cbd6704e84c63c1.r2.dev"
output_file = "assets/info.json"
default_cover = "assets/image/default_cover.jpg"

# Ensure cover folder exists
os.makedirs(cover_folder, exist_ok=True)

songs = []

for file_name in os.listdir(audio_folder):
    if file_name.endswith(".mp3"):
        file_path = os.path.join(audio_folder, file_name)
        song_name = os.path.splitext(file_name)[0]
        cover_file_name = f"{song_name}.jpg"
        cover_file_path = os.path.join(cover_folder, cover_file_name)
        cover_url = f"{coverCdnPath}/{cover_file_name}"

        try:
            audio = MP3(file_path, ID3=ID3)
            tags = audio.tags

            title = tags.get("TIT2").text[0] if "TIT2" in tags else song_name
            artist = tags.get(
                "TPE1").text[0] if "TPE1" in tags else "Unknown Artist"
            album = tags.get(
                "TALB").text[0] if "TALB" in tags else "Unknown Album"
            duration = int(audio.info.length)

            # Try to extract cover art
            cover_saved = False
            if tags:
                for tag in tags.values():
                    if isinstance(tag, APIC):
                        img_data = tag.data
                        try:
                            img = Image.open(io.BytesIO(img_data))
                            img = img.convert("RGB")  # Ensure JPEG compatible
                            img.save(cover_file_path, "JPEG")
                            cover_saved = True
                        except Exception as img_e:
                            print(
                                f"Error saving cover for {file_name}: {img_e}")
                        break

            songs.append({
                "title": title,
                "artist": artist,
                "album": album,
                "src": f"{cdnPath}/{file_name}",
                "cover": cover_url if cover_saved else default_cover,
                "duration": duration
            })
        except Exception as e:
            print(f"Error processing file {file_name}: {e}")

with open(output_file, 'w') as json_file:
    json.dump(songs, json_file, indent=2)

print(f"Song metadata saved to {output_file}")
