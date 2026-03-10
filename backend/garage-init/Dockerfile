FROM dxflrs/garage:v1.0.1 AS garage
FROM alpine:3.21

# Install dependencies for the script
RUN apk add --no-cache ca-certificates wget

# Copy garage binary from the official image
COPY --from=garage /garage /usr/local/bin/garage

# Copy the initialization script
WORKDIR /app
COPY ./init-garage.sh /app/init-garage.sh
RUN chmod +x /app/init-garage.sh

# Entrypoint using sh
ENTRYPOINT ["/bin/sh", "/app/init-garage.sh"]
