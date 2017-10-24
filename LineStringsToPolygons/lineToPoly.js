const MongoClient = require('mongodb').MongoClient
const turf = require('@turf/turf')
const argv = require('yargs').argv

var mongoUrl = argv.mongoUrl 
var collectionName = argv.collectionName

var cursor
var count = 0
var db = null

MongoClient.connect(mongoUrl)
	.then(_db => {
		db = _db // Make it available globally
		console.log(`Connected to DB ${mongoUrl}`)
		convertLinetoPoly((callback) => {
			console.log(`Added ${count} Polygon features derived from LineString`)
			removeLineAndPoints((err) => {
				if (!err) {
					process.exit()
				}
			})
		})
	})
	.catch(err => {
		console.error('Could not connect to DB ', err)
	})

function convertLinetoPoly(callback) {
	cursor = db.collection(collectionName).find({ $and: [{ 'geometry.type': 'LineString' }, { 'properties.height': { $exists: true } }] })
	iterateCollectionCursor((cb) => {
		callback(null)
	})
}

function iterateCollectionCursor(cb) {
	cursor.nextObject((err, feature) => {
		if (feature && !err) {
			count++

			db.collection(collectionName).insert(turf.lineStringToPolygon(feature))

			iterateCollectionCursor(cb)
		} else {
			cb() // No more items
		}
	})
}

function removeLineAndPoints(callback) {
	db.collection(collectionName).remove({ $and: [{ 'geometry.type': 'LineString' }, { 'properties.height': { $exists: true } }] }, (err, result) => {
		if (!err) {
			console.log(`Removed LineString features`)
			db.collection(collectionName).remove({ $and: [{ 'geometry.type': 'Point' }, { 'properties.height': { $exists: true } }] }, (err, result) => {
				if (!err) {
					console.log(`Removed Point features`)
					callback(null)
				}
			})
		}
	})
}