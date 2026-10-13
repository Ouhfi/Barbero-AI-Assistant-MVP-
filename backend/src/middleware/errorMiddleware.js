export const notFound = (req, res, next) => {
res.status(404).json({
success: false,
message: `Route not found: ${req.method} ${req.originalUrl}`,
});
};

export const errorHandler = (err, req, res, next) => {
if (res.headersSent) {
return next(err);
}

console.error(err);

const statusCode =
Number.isInteger(err.statusCode) &&
err.statusCode >= 400 &&
err.statusCode < 600
? err.statusCode
: 500;

res.status(statusCode).json({
success: false,
message:
statusCode === 500
? "Internal server error"
: err.message,
});
};