module.exports = (err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  // Controllers respond with { error }; mirror that here so the frontend has a
  // single field to read. Internal 500 details are not echoed to the client.
  const message = status >= 500 ? 'Internal Server Error' : (err.message || 'Error');
  res.status(status).json({ error: message, message });
};
