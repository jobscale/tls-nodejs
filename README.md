# tls-nodejs

## linting

```
npm run lint --if-present
```

## testing

```
npm test --if-present
```

## debugging

```
npm start
```

## example container
```
git clone https://github.com/jobscale/tls-nodejs.git
cd tls-nodejs
main() {
  delayOpen() {
    sleep 3
    xdg-open http://127.0.0.1:3000
  }
  docker build . -t local/tls-nodejs
  delayOpen &
  docker run --rm --name tls-nodejs -p 3000:3000 -it local/tls-nodejs
} && main
```
