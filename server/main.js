const fastify = require('fastify')({ logger: true });

const dbPath = require('path').join(__dirname, './db.sqlite');
console.log('Database path', dbPath);
const knex = require('knex')({
    client: 'sqlite3',
    connection: {
        filename: dbPath,
    },
    pool: {
        min: 0,
        max: 7,
    },
    useNullAsDefault: true,
});

async function initDatabase() {
    if (!(await knex.schema.hasTable('ranks'))) {
        console.log('Create ranks table');
        await knex.schema.createTable('ranks', (builder) => {
            builder.increments('id');
            builder.string('username');
            builder.timestamp('time');
            builder.string('text');
            builder.timestamp('upload_time').defaultTo(knex.fn.now());
        });
    }
    console.log(await knex.schema.hasTable('ranks'));
    console.log(await knex.schema.hasTable('cheats'));
    if (!(await knex.schema.hasTable('cheats'))) {
        console.log('Create cheats table');
        await knex.schema.createTable('cheats', (builder) => {
            builder.increments('id');
            builder.string('username');
            builder.timestamp('time');
            builder.timestamp('upload_time').defaultTo(knex.fn.now());
        });
    }
    console.log('Database init');
}

function initWeb() {
    fastify.get('/', (request, reply) => {
        return { ok: true };
    });

    fastify.post(
        '/upload',
        {
            schema: {
                body: {
                    type: 'object',
                    required: ['name', 'time', 'text'],
                    properties: {
                        name: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 24,
                        },
                        time: {
                            type: 'number',
                        },
                        text: {
                            type: 'string',
                            minLength: 5,
                        },
                    },
                },
            },
        },
        async (request, reply) => {
            const { name: username, time, text } = request.body;
            if (request.body.time <= 10000) {
                await knex
                    .insert({
                        username,
                        time,
                    })
                    .into('cheats');
            } else {
                await knex
                    .insert({
                        username,
                        time,
                        text,
                    })
                    .into('ranks');
            }
            return { ok: true };
        }
    );

    fastify.get(
        '/ranks',
        {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        limit: {
                            type: 'number',
                            maximum: 30,
                        },
                        offset: {
                            type: 'number',
                        },
                        orderdesc: {
                            type: 'boolean',
                        },
                        cheat: {
                            type: 'boolean',
                        },
                    },
                },
            },
        },
        async (request, reply) => {
            var query = knex
                .select('*')
                .from(request.query.cheat ? 'cheats' : 'ranks')
                .orderBy('time', request.query.orderDesc ? 'desc' : 'asc');
            if (request.query.limit) query.limit(request.query.limit);
            if (request.query.offset) query.offset(request.query.offset);
            return await query;
        }
    );

    fastify.listen({ port: 1293 }, (err) => {
        if (err) {
            fastify.log.error(err);
            process.exit(1);
        }
    });
}

initDatabase();
initWeb();
