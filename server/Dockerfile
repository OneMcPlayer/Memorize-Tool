FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy server files
COPY . .

# Expose the port the server runs on
EXPOSE 5000

# Command to run the server
CMD ["node", "index.js"]
