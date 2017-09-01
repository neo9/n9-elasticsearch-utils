import test from 'ava'
import * as elasticsearch from 'elasticsearch'

import N9ElasticSearchUtils from '../src'

import { init } from './fixtures/helpers'
import conf from './fixtures/conf'

let client = null

test.before('Create client', async (t) => {
	client = await init()
})

test('new instance should be an instance of N9ElasticSearchUtils', async (t) => {
	const utils = new N9ElasticSearchUtils(client)

	t.truthy(utils instanceof N9ElasticSearchUtils)
})

test('createIndice should return 200', async (t) => {
	const utils = new N9ElasticSearchUtils(client)

	const response = await utils.createIndice(conf.index, conf.settings, conf.mappings)

	t.truthy(response.acknowledged)
})
