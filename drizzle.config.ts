export default {
	schema: "./src/db/schema.ts",
	out: "./drizzle",
	dialect: "sqlite",
	dbCredentials: {
		url: "./data.db",
	},
	verbose: true,
	strict: true,
};
