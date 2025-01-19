from gtts import gTTS
import sys

def text_to_speech(text):
    try:
        # Create gTTS object
        tts = gTTS(text=text, lang='ml', slow=False)
        
        # Save the audio file in 'public/' folder
        tts.save('public/output.mp3')
        return True
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1:
        malayalam_text = sys.argv[1]
        text_to_speech(malayalam_text)
