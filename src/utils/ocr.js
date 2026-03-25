export async function runOCR(imageFile) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64Image = e.target.result.split(',')[1];
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY || 'YOUR_ANTHROPIC_API_KEY', // USER should provide this or it should be in env
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: "claude-3-5-sonnet-20240620",
            max_tokens: 1024,
            messages: [{
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/jpeg",
                    data: base64Image
                  }
                },
                {
                  type: "text",
                  text: "Extract 'amount' (number), 'category' (one of: food, housing, education, transport, medical, culture, clothing, sub, etc), and 'memo' (store name) from this receipt. Return ONLY JSON: {amount, cat, memo}."
                }
              ]
            }]
          })
        });

        const data = await response.json();
        const text = data.content[0].text;
        const json = JSON.parse(text.match(/\{.*\}/s)[0]);
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(imageFile);
  });
}
