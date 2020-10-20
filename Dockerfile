FROM nginx:alpine
COPY default.conf /etc/nginx/conf.d/default.conf
COPY ./FCSWeb /usr/share/nginx/html