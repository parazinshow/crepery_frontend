export const getSquareConfig = () => {
  const isProd =
    process.env.NODE_ENV === 'production' ||
    process.env.SQUARE_ENV === 'production'

  const baseUrl = isProd
    ? process.env.SQUARE_PRODUCTION_URL
    : process.env.SQUARE_SANDBOX_URL

  const token = isProd
    ? process.env.SQUARE_PRODUCTION_ACCESS_TOKEN
    : process.env.SQUARE_SANDBOX_ACCESS_TOKEN

  return { baseUrl, token }
}