export default {
	index: 'n9-elasticsearch-utils-test',
	settings: {
		refresh_interval: '-1',
		max_result_window: 50000,
		analysis: {
			filter: {
				autocomplete_filter: {
					type: 'edge_ngram',
					min_gram: 3,
					max_gram: 20
				}
			},
			analyzer: {
				autocomplete_search: {
					type: 'custom',
					tokenizer: 'standard',
					filter: [
						'lowercase',
						'asciifolding',
						'stop'
					]
				},
				autocomplete: {
					type: 'custom',
					tokenizer: 'standard',
					filter: [
						'lowercase',
						'asciifolding',
						'stop',
						'autocomplete_filter'
					]
				}
			}
		}
	},
	mappings: {
		product: {
			_all: {
				enabled: false
			},
			properties: {
			}
		}
	}
}
