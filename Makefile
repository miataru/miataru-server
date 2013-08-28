NODE_MODULE_COMMANDS_PATH=./node_modules/.bin/
MOCHA=$(NODE_MODULE_COMMANDS_PATH)mocha

install-packages:
	npm install

run-unit-tests:
	@NODE_ENV=test $(MOCHA) ./tests/unit

run-integration-tests:
	@NODE_ENV=test $(MOCHA) ./tests/integration

run-all-tests:
	@$(MAKE) run-unit-tests
	@$(MAKE) run-integration-tests