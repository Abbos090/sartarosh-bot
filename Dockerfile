# Node.js versiyasini tanlaymiz
FROM node:18-alpine

# Ishchi katalogni belgilaymiz
WORKDIR /app

# Package fayllarini ko'chirib o'tkazamiz
COPY package*.json ./

# Kutubxonalarni o'rnatamiz
RUN npm install --production

# Qolgan barcha kodlarni ko'chiramiz
COPY . .

# Botni ishga tushirish buyrug'i
CMD [ "npm", "start" ]