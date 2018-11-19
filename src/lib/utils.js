function upperFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

function pickResourceType(template, resourcesType){
    const resources = [];
    for (key in template.Resources) {
        const resource = template.Resources[key]
        if (resource.Type === resourcesType) {
            resources.push({
                key,
                resource
            })
        }
    }
    return resources;
}

module.exports = {
    upperFirst,
    pickResourceType
}