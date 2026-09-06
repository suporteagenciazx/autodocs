# AutoDocs — PHP 8.2 + Apache (Docker)
FROM php:8.2-apache-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        $PHPIZE_DEPS \
        libssl-dev \
        libonig-dev \
        libzip-dev \
        nodejs \
        npm \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && docker-php-ext-install -j$(nproc) pdo_mysql mbstring opcache zip \
    && a2enmod rewrite headers expires deflate \
    && apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false $PHPIZE_DEPS \
    && rm -rf /var/lib/apt/lists/*

COPY docker/apache/000-default.conf /etc/apache2/sites-available/000-default.conf
COPY docker/php/opcache.ini /usr/local/etc/php/conf.d/zz-opcache.ini
COPY docker/php/autodocs.ini /usr/local/etc/php/conf.d/zz-autodocs.ini

COPY docker/entrypoint.sh /usr/local/bin/autodocs-entrypoint.sh
RUN chmod +x /usr/local/bin/autodocs-entrypoint.sh \
    && sed -i 's/\r$//' /usr/local/bin/autodocs-entrypoint.sh

COPY . /var/www/html/

WORKDIR /var/www/html/tools/figma-package
RUN npm install --omit=dev

WORKDIR /var/www/html/tools/pdf-native
RUN npm install --omit=dev

WORKDIR /var/www/html

RUN chown -R www-data:www-data /var/www/html/api/private \
    && find /var/www/html -type d -exec chmod 755 {} \; \
    && find /var/www/html -type f -exec chmod 644 {} \; \
    && chmod 775 /var/www/html/api/private \
    && chmod +x /usr/local/bin/autodocs-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/autodocs-entrypoint.sh"]
CMD ["apache2-foreground"]
