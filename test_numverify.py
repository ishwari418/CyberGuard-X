import httpx
import os
from dotenv import load_dotenv
import asyncio

load_dotenv("services/ml-engine/.env")

async def test_numverify():
    api_key = os.getenv("NUMVERIFY_API_KEY")
    print(f"Testing with API Key: {api_key}")
    
    # Test with a known valid number (e.g., Google US support)
    test_number = "16502530000" 
    url = f"http://apilayer.net/api/validate?access_key={api_key}&number={test_number}"
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(url)
        print(f"Status Code: {resp.status_code}")
        print(f"Response: {resp.text}")

if __name__ == "__main__":
    asyncio.run(test_numverify())
