import * as elasticsearch from 'elasticsearch'
import conf from './conf'

const createClient = (): elasticsearch.Client => {
	return new elasticsearch.Client({
		host: 'http://localhost:9200'
	})
}

const reset = async (client: elasticsearch.Client) => {
	await client.indices.delete({ index: `${conf.index}_1`, ignore: [404] })
	await client.indices.delete({ index: `${conf.index}_2`, ignore: [404] })
	await client.indices.deleteAlias({ index: `${conf.index}_1`, name: conf.index, ignore: [404] })
	await client.indices.deleteAlias({ index: `${conf.index}_2`, name: conf.index, ignore: [404] })
}

export const init = async () => {
	const client = createClient()

	await reset(client)

	return client
}
