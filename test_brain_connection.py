
import google.generativeai as genai
import os
import json

# The Key provided by the user
API_KEY = "AIzaSyAXk9rw8otEWVJw_MmyDxLGGh5WxGj9Q9Q"

print(f"1. Configuring Gemini with Key: {API_KEY[:5]}...{API_KEY[-5:]}")
genai.configure(api_key=API_KEY)

# Try connecting to the model
MODEL_NAME = 'gemini-pro'
print(f"2. Attempting to connect to model: {MODEL_NAME}")
model = genai.GenerativeModel(MODEL_NAME)

print("3. Sending test message: 'Hello'")
try:
    response = model.generate_content("Hello")
    print("\nSUCCESS! Connection established.")
    print(f"Response: {response.text}")
except Exception as e:
    print("\nFAILED to connect.")
    print("-" * 30)
    print(f"ERROR TYPE: {type(e).__name__}")
    print(f"ERROR MESSAGE: {e}")
    print("-" * 30)
    print("\nDIAGNOSIS:")
    if "404" in str(e):
        print("-> The Model Name is wrong OR the API is disabled.")
    if "403" in str(e) or "API_KEY_INVALID" in str(e):
         print("-> The API Key is invalid.")
    if "Generative Language API has not been used" in str(e):
        print("-> The API service is DISABLED in Google Cloud Console.")
