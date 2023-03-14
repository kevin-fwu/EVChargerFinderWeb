GOBIN:=~/go/bin

all: evchargerfinder

evchargerfinder:
	$(GOBIN)/hugo --config config.toml,env.toml

clean:
	rm -rf public/