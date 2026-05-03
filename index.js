const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send('<h1>Vibe App is running! Next step: GCS Upload.</h1>');
});

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
