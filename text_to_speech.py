from gtts import gTTS
import sys
import os
import time

text = sys.argv[1]
filename = f"{int(time.time())}.mp3"
filepath = os.path.join("public", "uploads", filename)

tts = gTTS(text)
tts.save(filepath)
print(filename)
