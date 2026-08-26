import os
from google import genai

# Initialize with OpenRouter's endpoint and your free OpenRouter key
client = genai.Client(
    api_key="AIzaSyBdhGnhQlWj8s5356x8A1V5pewyof6gBGs"
)

stream = client.interactions.create(
    model="gemini-3.6-flash",
    input="Hello! Explain what a Discord bot is.",
    stream=True
)

for event in stream:
    if event.event_type == "step.delta":
        if event.delta.type == "text":
            print(event.delta.text, end="", flush=True)