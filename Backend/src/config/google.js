const { google } = require("googleapis")

module.exports = function getOAuth2() {
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    "http://localhost:8000/api/auth/google/callback";

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
};
