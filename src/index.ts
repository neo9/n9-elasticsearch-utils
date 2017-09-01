import * as _ from 'lodash'
import * as elasticsearch from 'elasticsearch'

export default class N9ElasticSearchUtils {
	constructor(private client, private log?, private options?) {
	}

	public async createIndice(indice, settings, mappings) {
		const promises = [
			`${indice}_1`,
			`${indice}_2`
		].map(async (index) => await this.createIndex(index, settings, mappings))

		await Promise.all(promises)

		const existsAlias = await this.client.indices.existsAlias({ name: indice })

		if (!existsAlias) {
			if (this.log) this.log(`Creating ${indice} alias pointing to ${indice}_1`)

			return await this.client.indices.putAlias({
				name: indice,
				index: `${indice}_1`
			})
		}
	}

	public async createIndex(index, settings, mappings) {
		const existsIndex = await this.client.indices.exists({ index })

		if (existsIndex) return

		if (this.log) this.log(`Creating ${index} index`)

		return await this.client.indices.create({
			index,
			body: {
				settings,
				mappings
			}
		})
	}

	public async reindexIndice(indice) {
		const usedIndex = await this.getUsedIndex(indice)
		const unusedIndex = await this.getUnusedIndex(indice)

		await this.client.reindex({
			requestTimeout: '600000',
			body: {
				source: {
					index: usedIndex
				},
				dest: {
					index: unusedIndex
				}
			},
			waitForCompletion: true
		})

		return unusedIndex
	}

	public async swapIndice(indice) {
		const usedIndex = await this.getUsedIndex(indice)
		const unusedIndex = await this.getUnusedIndex(indice)

		if (this.log) this.log(`Moving alias ${indice} from ${usedIndex} to ${unusedIndex}`)

		return await this.client.indices.updateAliases({
			body: {
				actions: [
					{ remove: { index: usedIndex, alias: indice } },
					{ add: { index: unusedIndex, alias: indice } }
				]
			}
		})
	}

	public async clearIndice(indice, settings, mappings) {
		const usedIndex = await this.getUsedIndex(indice)
		const unusedIndex = await this.getUnusedIndex(indice)

		await this.clearIndex(unusedIndex, settings, mappings)

		return unusedIndex
	}

	public async clearIndex(index, settings, mappings) {
		if (this.log) this.log(`Clearing ${index} index`)

		const exists = await this.client.indices.exists({ index })

		if (exists) await this.client.indices.delete({ index })

		return await this.client.indices.create({
			index,
			body: {
				settings,
				mappings
			}
		})
	}

	public async refreshIndex(index) {
		return await this.client.indices.refresh({ index })
	}

	public generateTermFilter(field, value) {
		const term = {}
		term[field] = value

		return typeof value === 'object' ? { terms: term } : { term }
	}

	public generateExistsFilter(field) {
		return {
			exists: {
				field
			}
		}
	}

	public generateRangeFilter(field, values) {
		const rangeFilter = {
			bool: {
				should: []
			}
		}

		if (!Array.isArray(values)) values = [values]

		values.forEach((value) => {
			const limits = _.map(value.split('-'), _.parseInt)
			const range = {}

			range[field] = {
				gte: _.min(limits),
				lte: _.max(limits)
			}

			rangeFilter.bool.should.push({ range })
		})

		return rangeFilter
	}

	public generateAggregation(type, field, options) {
		// Remove postfilter concerning current aggregation
		const postFiltersFiltered = _.filter(options.post_filter || [], (filter: any) => {
			if (type === 'stats') return !(_.get(filter, 'bool.should'))
			if (type === 'terms') return !(filter.term || filter.terms) || ((filter.term && !filter.term[field]) || (filter.terms && !filter.terms[field]))

			return true
		})

		const aggregationFilters = postFiltersFiltered.length ? {
			and: postFiltersFiltered
		} : undefined

		const aggregation: any = {}
		aggregation[type] = {
			field,
			size: type === 'terms' ? (options.size || 250) : undefined,
			order: type === 'terms' ? options.order : undefined,
			ranges: type === 'range' ? options.ranges : undefined
		}

		if (options.otherAggregations) aggregation.aggs = options.otherAggregations

		return aggregationFilters ? {
			filter: aggregationFilters,
			aggs: {
				results: aggregation
			}
		} : aggregation
	}

	public async search(index, size: number, page: number, body) {
		return await this.client.search({
			index,
			size,
			from: page * size,
			body
		})
	}

	private async getUsedIndex(indice) {
		const response = await this.client.indices.getAlias({ name: indice })

		return Object.keys(response)[0]
	}

	private async getUnusedIndex(indice) {
		const indices = {}

		indices[`${indice}_1`] = `${indice}_2`
		indices[`${indice}_2`] = `${indice}_1`

		const response = await this.client.indices.getAlias({ name: indice })

		return indices[Object.keys(response)[0]]
	}
}
