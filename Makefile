build: build@types build@cjs build@esm

build@cjs:
	rm -rf ./lib/cjs/
	bunx tsc --project ./tsconfig.cjs.json --outDir ./lib/cjs/
	echo '{ "type": "commonjs" }' >> ./lib/cjs/package.json

build@esm:
	rm -rf ./lib/esm/
	bunx tsc --project ./tsconfig.esm.json --outDir ./lib/esm/
	echo '{ "type": "module" }' >> ./lib/esm/package.json

build@types:
	rm -rf ./lib/types/
	bunx tsc --project ./tsconfig.types.json --outDir ./lib/types/
	echo '{ "type": "module" }' >> ./lib/types/package.json
