FROM node:18

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies - using --legacy-peer-deps to handle conflicts
RUN npm install --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Vite dev server port
EXPOSE 3000

CMD ["npm", "run", "dev"]
