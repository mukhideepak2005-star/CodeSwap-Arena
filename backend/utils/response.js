// Standardized JSON response helper

function success(res, data = {}, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
}

function error(res, message = 'An error occurred', statusCode = 500, details = null) {
  const payload = {
    success: false,
    message
  };
  if (details && process.env.NODE_ENV !== 'production') {
    payload.details = details;
  }
  return res.status(statusCode).json(payload);
}

module.exports = {
  success,
  error
};
