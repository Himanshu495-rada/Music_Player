import os
import json
from mutagen.mp3 import MP3
from mutagen.id3 import ID3, TIT2, TPE1, TALB

# Define the audio folder path
audio_folder = "assets/audio"
cdnPath = "https://pub-c403363b2b11447bb27eb2c6cbcc103d.r2.dev"
output_file = "assets/info.json"

# Prepare the list to hold song metadata
songs = []

# Iterate through all files in the audio folder
for file_name in os.listdir(audio_folder):
    if file_name.endswith(".mp3"):  # Process only MP3 files
        file_path = os.path.join(audio_folder, file_name)
        try:
            # Read metadata using mutagen
            audio = MP3(file_path, ID3=ID3)
            tags = audio.tags

            # Extract metadata fields
            title = tags.get(
                "TIT2").text[0] if "TIT2" in tags else os.path.splitext(file_name)[0]
            artist = tags.get(
                "TPE1").text[0] if "TPE1" in tags else "Unknown Artist"
            album = tags.get(
                "TALB").text[0] if "TALB" in tags else "Unknown Album"
            duration = int(audio.info.length)  # Duration in seconds

            # Add song metadata to the list
            songs.append({
                "title": title,
                "artist": artist,
                "album": album,
                "src": f"{cdnPath}/{file_name}",
                "cover": "assets/image/default_cover.jpg",  # Default cover path
                "duration": duration
            })
        except Exception as e:
            print(f"Error processing file {file_name}: {e}")

with open(output_file, 'w') as json_file:
    json.dump(songs, json_file, indent=2)

print(f"Song metadata saved to {output_file}")
