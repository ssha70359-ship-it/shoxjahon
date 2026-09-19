/**
 * Async kontrollerdagi xatoni Express'ning xato ushlagichiga uzatadi.
 * Bu bo'lmasa `await` ichidagi xato "unhandled rejection" bo'lib serverni osib qo'yadi.
 */
export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export default asyncHandler;
