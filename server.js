const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

// Environment variables
const CLIENT_ID = process.env.DROPBOX_CLIENT_ID;
const CLIENT_SECRET = process.env.DROPBOX_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

let ACCESS_TOKEN = null;

// Health check
app.get("/", (req, res) => {
  res.send("Dropbox MCP server is running");
});

// OAuth callback
app.get("/oauth/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("Missing 'code' in query params");

  try {
    const params = new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
    });

    const token = await axios.post(
      "https://api.dropboxapi.com/oauth2/token",
      params.toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    ACCESS_TOKEN = token.data.access_token;
    res.send("Dropbox collegato! Puoi tornare su ChatGPT.");
  } catch (err) {
    res.status(500).send("OAuth error: " + err.message);
  }
});

// List files
app.post("/list_files", async (req, res) => {
  if (!ACCESS_TOKEN) return res.status(401).send("Dropbox non collegato");

  try {
    const response = await axios.post(
      "https://api.dropboxapi.com/2/files/list_folder",
      { path: "" },
      { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } }
    );
    res.json(response.data);
  } catch (e) {
    res.status(500).json(e.response?.data || { error: e.message });
  }
});

// Read file
app.post("/read_file", async (req, res) => {
  if (!ACCESS_TOKEN) return res.status(401).send("Dropbox non collegato");

  const path = req.body?.path;
  if (!path) return res.status(400).send("Missing 'path' in request body");

  try {
    const response = await axios.post(
      "https://content.dropboxapi.com/2/files/download",
      null,
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Dropbox-API-Arg": JSON.stringify({ path }),
        }
      }
    );
    res.send(response.data);
  } catch (e) {
    res.status(500).json(e.response?.data || { error: e.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server MCP Dropbox attivo su", PORT));
