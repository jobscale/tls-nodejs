# reverse-proxy

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
git clone https://github.com/jobscale/reverse-proxy.git
cd reverse-proxy
main() {
  delayOpen() {
    sleep 3
    xdg-open http://127.0.0.1:3000
  }
  docker build . -t local/whoami
  delayOpen &
  docker run --rm --name reverse-proxy -p 3000:3000 -it local/reverse-proxy
} && main
```
