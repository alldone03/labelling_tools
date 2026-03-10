FROM node:18

WORKDIR /app

# Copy package files 
# We swap package-lock.json for yarn.lock
COPY package.json yarn.lock* ./

# Install dependencies
# 'yarn install --frozen-lockfile' is the equivalent of 'npm ci'
# It ensures your production/container build matches your local lockfile exactly
RUN yarn install --frozen-lockfile

# Copy the rest of the application
# COPY . .

# Vite dev server port
EXPOSE 3000

CMD ["yarn", "dev"]