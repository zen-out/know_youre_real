const { extend } = require("lodash")
const { upset } = require("whats_wrong")
const { passwordToHash, hashToPassword } = require("./passwordHash")
const { see, hourglass } = require("code_clarity")
const when_you_free = require("when_you_free")
const ef = require("effective_knex")
const validate = require('validator');

const knex = require("knex")({
        client: "postgresql",
        connection: {
            database: "optee_test",
            user: "postgres",
            password: "postgres",
        }
    })
    /**********************************************
     * 
     * ==================================
     * - [ ] Finish login route 
     ***********************************************/
    // table.increments("id").primary();
    // table.string("gmail_id");
    // table.string("facebook_id");
    // table.string("spotify_id");
    // table.string("name");
    // table.string("email").unique();
    // table.boolean("verified");
    // table.string("theme")
    // table.string("hash");
    // table.boolean("logged_in");
    // table.timestamp("created").defaultTo(knex.fn.now());

// table.increments("id").primary();
//     table.integer("user_id").unsigned().references("user.id").onUpdate("CASCADE").onDelete("CASCADE")

//     table.string("type")
//     table.string("device")
// table.timestamp("last_login")
//     table.timestamp("created").defaultTo(knex.fn.now());
function getDeviceInfo(req, object) {
    let device = req.device.parser.useragent.source
    let type = req.device.type;
    object["device"] = device;
    object["type"] = type;
    return object;
}

/**
 * @description 
 * 1. Get device
 * 2. If device exists
 * 3. Update the last login date 
 * 4. Else, create new device 
 * 5. Return device
 * @example 
 *   userObject["user_id"] = postUser.id
            userObject["device"] = req.device.parser.useragent.source;
            userObject["type"] = req.device.type;
            let getPost = await postDevice(knex, userObject)
 * @author zen-out
 * @date 2022-03-16
 * @param {any} knex
 * @param {any}  object
 * @returns {any}
 */
async function postDevice(knex, object) {
    try {
        let getThis = await knex("device").select("*").where({ user_id: object.user_id, type: object.type, device: object.device })
        let date = Date.now()
        let format = when_you_free.formatDateToPost(date)
        if (getThis.length > 0) {
            let obj = ef.getObject(getThis)
            obj["last_login"] = format;
            let update = await knex("device").update(obj).where({ id: obj.id })
            let getOne = await knex("device").select("*").where({ id: obj.id })
            let objectified = ef.getObject(getOne);
            delete objectified["id"]
            return objectified;
        } else {
            let postDevice = await ef.post(knex, "device", object)
            let update = await knex("device").update({ last_login: format }).where({ id: postDevice.id })
            let getOne = await knex("device").select("*").where({ id: postDevice.id })
            let objectified = ef.getObject(getOne);
            delete objectified["id"]
            return objectified;
        }
    } catch (error) {
        upset("post device error" + error, "know_youre_real", "should be able to post device")
    }
}

/**
 * @description 
 * 1. Will grab user from user table 
 * 2. If user exists, will return error object 
 * 3. Otherwise, will change logged_in to true 
 * 4. Will set last_login to today's date. 
 * @example
 *  let firstSignup = await signup(sampleRequest, knex, sampleObject)
 * @author zen-out
 * @date 2022-03-16
 * @param {any} knex
 * @param {any}  userObject
 * @returns {any}
 */
async function signup(req, knex, userObject) {
    try {
        let obj = {}
        obj["email"] = userObject.email
        let cleanedObject = await ef.getByObject(knex, "user", "email", obj)
        if (cleanedObject.length === 1) {
            return upset("already a registered user", "already registered", "go to login page")
        } else if (cleanedObject.length === 0) {
            let getValidate = validate.isEmail(userObject.email)
            if (getValidate) {
                let changePass = await passwordToHash(userObject.password)
                userObject["hash"] = changePass;
                userObject["logged_in"] = true;
                let postUser = await ef.post(knex, "user", userObject)
                userObject["user_id"] = postUser.id
                userObject["device"] = req.device.parser.useragent.source;
                userObject["type"] = req.device.type;
                let getPost = await postDevice(knex, userObject)

                let merged = extend(userObject, getPost)
                delete merged["password"]

                merged["id"] = postUser.id
                return merged;
            } else {
                return upset("not valid email", "in know_youre_real", "should be valid email")
            }
        } else {
            return upset("how come we have more than one user email?", "routes", "should only have one object in array")
        }
    } catch (error) {
        return upset("error: " + error, "know you're real, routes.js", "supposed to be able to post user")
    }
}
/**
 * @description
- Transforms hash to password
- Changes logged_in in user table to true 
- Changes last logged in date in device table
 * @example
    // let firstLogin = await login(sampleRequest, knex, sampleObject)
 * @author zen-out
 * @date 2022-03-16
 * @param {any} knex
 * @param {any}  userObject
 * @returns {any}
 */
async function login(req, knex, userObject) {
    try {
        let obj = {}
        obj["email"] = userObject.email
        let cleanedObject = await ef.getByObject(knex, "user", obj)
        let getObject = await ef.getObject(cleanedObject)
        if (cleanedObject.length === 1) {
            let verifyPass = await hashToPassword(userObject.password, getObject.hash)
            if (verifyPass) {
                let updateLoggedIn = await ef.updateOne(knex, "user", getObject.id, "logged_in", true)
                userObject["user_id"] = getObject.id
                userObject["device"] = req.device.parser.useragent.source;
                userObject["type"] = req.device.type;
                let getPost = await postDevice(knex, userObject)
                let merged = extend(userObject, getPost)
                delete merged["password"]
                merged["id"] = getObject.id
                return merged;
            } else {
                return upset("wrong password", "in know youre real", "try again")
            }
        } else if (cleanedObject.length === 0) {
            return upset("havent signed up yet", "in know_youre_real", "go to signup page")
        } else {
            return upset("how come we have more than one user email?", "routes", "should only have one object in array")
        }
    } catch (error) {
        return upset("error: " + error, "know you're real, routes.js", "supposed to be able to login user")
    }

    // hash password 
}


/**
 * @example
    // let verify = await verifyUserRoute(sampleRequest, knex, 1)
 * @description 
    1. Checks if user is logged in 
 * @author zen-out
 * @date 2022-03-16
 * @param {any} req
 * @param {any}  res
 * @param {any}  next
 * @returns {any}
 */
async function verifyUserRoute(req, knex, user_id, dateSinceLastLogin) {
    try {
        let deviceCheck;
        let loggedInCheck;
        let cleanedObject = await ef.getOneByKeyAndValue(knex, "user", "id", user_id)
        let getObject = await ef.getObject(cleanedObject)
        if (getObject.email) {
            let deviceObj = {}
            deviceObj["user_id"] = getObject.id
            deviceObj["device"] = req.device.parser.useragent.source;
            deviceObj["type"] = req.device.type;
            let getLastUpdate = await ef.getByObject(knex, "device", deviceObj)
            let objectified = ef.getObject(getLastUpdate)
            let merged = extend(getObject, objectified)
            deviceCheck = when_you_free.dateIsWithinLimit(merged.last_login, dateSinceLastLogin)
        }
        let updateLoggedIn = await ef.getOneByKeyAndValue(knex, "user", "id", user_id)
        if (updateLoggedIn["logged_in"] === true) {
            loggedInCheck = true;
        }
        if (deviceCheck && loggedInCheck) {
            return true;
        } else {
            return false;
        }
    } catch (error) { return upset("error: " + error, "know you're real, routes.js", "supposed to be able to verify user") }
}


/**
 * @description 
 * 1. Checks if user is logged in 
 * 2. If they are, change logged in to false 
 * @example 
 * let thenLogout = await logout(1) // returns true or false; 
 * @author zen-out
 * @date 2022-03-16
 * @param {any} user_id
 * @returns {any}
 */
async function logout(user_id) {
    try {
        let updateLoggedIn = await ef.getOneByKeyAndValue(knex, "user", "id", user_id)
        if (updateLoggedIn["logged_in"] === true) {
            let update = await ef.updateOne(knex, "user", user_id, "logged_in", false)
            return true;
        } else {
            return true;
        }
    } catch (error) { return upset("error: " + error, "know you're real, routes.js", "supposed to be able to verify user") }

}

async function testHandlePost() {

    let sampleRequest = {
        device: {
            parser: {
                useragent: {
                    source: "mac"
                }
            },
            type: "desktop"
        }
    }
    let sampleObject = {
        email: "lesleyc.2@gmail.com",
        password: "hello"
    }
    let sampleObject2 = {
        email: "lesle3yc2@gmail.com",
        password: "orange"
    }

    let getUsers = await ef.getByKeyValue(knex, "user", "email", "lesleyc.2@gmail.com")
    console.log("🚀 ~ file: routes.js ~ line 186 ~ testHandlePost ~ getUsers", getUsers)

    let firstSignup = await signup(sampleRequest, knex, sampleObject)
    console.log("🚀 ~ file: routes.js ~ line 210 ~ testHandlePost ~ firstSignup", firstSignup)
    let firstLogin = await login(sampleRequest, knex, sampleObject)
    console.log("🚀 ~ file: routes.js ~ line 194 ~ testHandlePost ~ firstLogin", firstLogin)
    let verify = await verifyUserRoute(sampleRequest, knex, 1)
    console.log("🚀 ~ file: routes.js ~ line 238 ~ testHandlePost ~ verify", verify)
    let thenLogout = await logout(firstSignup.id)
    console.log("🚀 ~ file: routes.js ~ line 284 ~ testHandlePost ~ thenLogout", thenLogout)

}

async function reset() {
    let remove1 = await knex("device").select("*").del()
    console.log(remove1)
    let remove = await knex("user").select("*").del()
    console.log(remove)

}

module.exports = { reset, getDeviceInfo, postDevice, signup, login, verifyUserRoute, logout, testHandlePost };