import httpx
import os
from dotenv import load_dotenv
import asyncio

load_dotenv("services/ml-engine/.env")

async def test_numverify_no_country_code():
    api_key = os.getenv("NUMVERIFY_API_KEY")
    print(f"Testing with API Key: {api_key}")
    
    # Test without country code
    test_number = "9876543210" 
    url = f"http://apilayer.net/api/validate?access_key={api_key}&number={test_number}"
    
    print(f"Requesting URL: {url}")
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url)
            print(f"Status Code: {resp.status_code}")
            print(f"Response: {resp.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_numverify_no_country_code())
