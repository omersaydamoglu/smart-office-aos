
const prisma = {
  user: {
    findUnique: jest.fn(),
  },
  loginAttempt: {
    create: jest.fn(),
  },
  session: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

module.exports = prisma;
