# Common tasks: `make help` lists them. Everything except the labs needs only Node 20+.
.PHONY: help serve test check docs build browser lab-up lab-down snapshot

help: ## list the targets
	@grep -E '^[a-z-]+:.*## ' Makefile | sed 's/:.*## /\t/'

serve: ## serve the atlas on http://localhost:8000 (opening index.html works too)
	python3 -m http.server 8000

test: ## unit tests: data integrity, matcher, layout, generated files, Markdown safety
	npm test

check: ## the data is valid and generated files are current (CI runs this)
	npm run check

docs: ## regenerate docs/ from the data
	node scripts/atlas.mjs docs

build: ## write dist/kafka-atlas.html, one file that works offline
	node scripts/atlas.mjs build

browser: ## render every view in Chromium (needs: npm install --no-save playwright)
	npm run test:browser

lab-up: ## start the three-node local cluster for the labs
	docker compose -f labs/compose.yaml up -d

lab-down: ## stop it and delete its data
	docker compose -f labs/compose.yaml down -v

snapshot: ## a read-only snapshot of a cluster: BS=host:port make snapshot
	tools/snapshot.sh
