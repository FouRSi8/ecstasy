const API_URL = 'http://localhost:3000/api/grade';

const PIXEL_B64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

async function testApi() {
  console.log('Testing API at:', API_URL);
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        image: PIXEL_B64,
        // No reference provided to trigger the PROMPT_SOCIAL path
      })
    });

    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text);

    if (response.ok) {
        try {
            const json = JSON.parse(text);
            if (json.result) {
                console.log("SUCCESS: Received valid result");
                const resultObj = JSON.parse(json.result);
                console.log("Parsed Result:", resultObj);
            } else {
                console.log("WARNING: Response body missing 'result' field");
            }
        } catch (e) {
            console.log("ERROR: Could not parse response JSON");
        }
    } else {
        console.log("FAILURE: Request failed");
    }

  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testApi();
