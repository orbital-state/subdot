# Variables
APP_NAME = subdot
DOCKER_REPO = orbitalstate/$(APP_NAME)
# The version is set to the latest commit SHA by default
# Uncomment the next line to use the latest commit SHA as the version
# GIT_SHA = $(shell git rev-parse --short HEAD)
# VERSION ?= 0.1.0-$(GIT_SHA)
VERSION ?= latest

# Commands
build:
	npm ci
	npm run build

docker-build:
	docker build -t $(APP_NAME):$(VERSION) .

docker-run:
	docker run --rm $(APP_NAME):$(VERSION) --help

docker-tag:
	docker tag $(APP_NAME):$(VERSION) $(DOCKER_REPO):$(VERSION)

docker-push: docker-tag
	docker push $(DOCKER_REPO):$(VERSION)

clean:
	rm -rf node_modules dist

# Convenience
all: clean build docker-build docker-push

.PHONY: build docker-build docker-run docker-tag docker-push clean all
