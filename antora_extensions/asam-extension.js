'use strict'
const File = require('./file')
// const classifyContent = require('@antora/content-classifier')

module.exports.register = function ({ config }) {
    const { numberedTitles, addToNavigation, unlistedPagesHeading = 'Unlisted Pages' } = config
    const logger = this.require('@antora/logger').get('unlisted-pages-extension')
    const macrosRegEx = new Array(
        { macro: "role", re: /^\s*role_related::(.*)\[(.*)\]\n?/ },
        { macro: "related", re: /^\s*related::(.*)\[(.*)\]\n?/ },
        { macro: "reference", re: /^\s*reference::(.*)\[(.*)\]\n?/ },
        { macro: "pages", re: /^\s*pages::([\[]*)\[(.*)\]\n?/ },
        { macro: "autonav", re: /^\s*\/\/\s*autonav::(.*)\[(.*)\]\n?/g }
    )

    const macrosHeadings = new Array(
        { macro: "role", heading: "== Role-related topics\n\n" },
        { macro: "related", heading: "== Related topics\n\n" },
        { macro: "reference", heading: "" },
        { macro: "pages", heading: "== Pages\n\n" },
        { macro: "autonav", heading: "" }
    )

    this
    //   Replace content
      .on('contentClassified', ({ contentCatalog }) => {
        console.log("Reacting on contentClassified")
        contentCatalog.getComponents().forEach(({ versions }) => {
            versions.forEach(({ name: component, version, url: defaultUrl }) => {

                let targetPath = config.keywords && config.keywords.path ? config.keywords.path : ""
                let targetModule = config.keywords && config.keywords.module ? config.keywords.module : "ROOT"
                let targetName = config.keywords && config.keywords.filename ? config.keywords.filename : "0_used-keywords.adoc"
                let useKeywords = config.keywords ? true : false

                let keywordOverviewPageRequested = config.keywords && config.keywords.createOverview && useKeywords ? true : false

                let pages = contentCatalog.findBy({ component, version, family: 'page'})
                let navFiles = contentCatalog.findBy({ component, version, family: 'nav'})
                let keywordPageMap = getKeywordPageMapForPages(useKeywords,pages)
                const rolePageMap = getRolePageMapForPages(pages)

                pages = createKeywordsOverviewPage(keywordOverviewPageRequested, contentCatalog, pages, keywordPageMap, targetPath, targetName, targetModule, component, version)
                keywordPageMap = getKeywordPageMapForPages(useKeywords,pages)
                pages = findAndReplaceCustomASAMMacros( contentCatalog, pages, navFiles, keywordPageMap, rolePageMap, macrosRegEx, macrosHeadings, logger, component, version )
                keywordPageMap = getKeywordPageMapForPages(useKeywords,pages)
                pages = createKeywordsOverviewPage(keywordOverviewPageRequested, contentCatalog, pages, keywordPageMap, targetPath, targetName, targetModule, component, version)

                navFiles = contentCatalog.findBy({ component, version, family: 'nav'})

                if (numberedTitles) {
                    generatePageNumberBasedOnNavigation(pages, navFiles)
                }
            })
        })
      })
    //   Find all unlisted files
      .on('navigationBuilt', ({ contentCatalog }) => {
        console.log("Reacting on navigationBuild")
        contentCatalog.getComponents().forEach(({ versions }) => {
          versions.forEach(({ name: component, version, navigation: nav, url: defaultUrl }) => {
            const navEntriesByUrl = getNavEntriesByUrl(nav)
            const unlistedPages = contentCatalog
              .findBy({ component, version, family: 'page' })
              .filter((page) => page.out)
              .reduce((collector, page) => {
                if ((page.pub.url in navEntriesByUrl) || page.pub.url === defaultUrl) return collector
                logger.warn({ file: page.src, source: page.src.origin }, 'detected unlisted page')
                return collector.concat(page)
              }, [])
            if (unlistedPages.length && addToNavigation) {
              nav.push({
                content: unlistedPagesHeading,
                items: unlistedPages.map((page) => {
                  return { content: page.asciidoc.navtitle, url: page.pub.url, urlType: 'internal' }
                }),
                root: true,
              })
            }
          })
        })
      })
  }

function getNavEntriesByUrl (items = [], accum = {}) {
items.forEach((item) => {
    if (item.urlType === 'internal') accum[item.url.split('#')[0]] = item
    getNavEntriesByUrl(item.items, accum)
})
return accum
}

function getKeywordPageMapForPages (useKeywords, pages = {}) {

    if (!useKeywords) {
        return (new Map())
    }
    var re = new RegExp("^\s*:keywords:(.*)")
    var keywordMap = generateMapForRegEx(re,pages,true)
    return keywordMap
}

function getRolePageMapForPages (pages = {}) {
    var re = new RegExp("{role-([^}]*)}")
    var rolesMap = generateMapForRegEx(re,pages)
    return rolesMap
}

const updateMapEntry = (inputMap, key, addedValue) => {
    const newValue = inputMap.get(key).add(addedValue)
    return (inputMap.set(key,newValue))
}

function generateMapForRegEx(re,pages,exclusive=false) {
    var generatedMap = new Map;
    for (let page of pages.filter((page) => page.out)) {
        var results = []
        for (var line of page.contents.toString().split("\n")) {
            const result = re.exec(line);
            if (result) {
                results.push(result)
                if (exclusive) {
                    break;
                }
            }
        }
        if (results) {
            for (let entry of results) {
                const split_results = entry[1].split(",")
                for (let keyword of split_results) {
                    const keywordTrimmed = keyword.trim()
                    if (generatedMap.has(keywordTrimmed)) {
                        generatedMap = updateMapEntry(generatedMap,keywordTrimmed,page)
                    }
                    else {
                        generatedMap.set(keywordTrimmed, new Set([page]))
                    }
                }
            }

        }
    }
    return (generatedMap)

}

function findAndReplaceCustomASAMMacros( contentCatalog, pages, navFiles, keywordPageMap, rolePageMap, macrosRegEx, macrosHeadings, logger, component, version) {
    const re = macrosRegEx.find(x => x.macro === "autonav").re;
    for (let nav of navFiles) {
        var m;
        let result;
        const content = nav.contents.toString().split("\n")
        for (let line in content) {
            result = re.exec(content[line])
            if (result){
                break;
            }
        }
        if (result) {
            const findModuleMainPage = result[2].split(",").indexOf("none") > -1 ? false : true

            pages = replaceAutonavMacro(contentCatalog, pages, nav, component, version, findModuleMainPage)
        }
    }

    for (const page of pages) {
        var pageContent = page.contents.toString().split("\n")
        for (const line of pageContent) {
            for (const entry of macrosRegEx) {
                const macro = entry.macro
                const re = entry.re
                const heading = macrosHeadings.find(x => x.macro === macro).heading
                const macroResult = re.exec(line)

                if (macroResult) {
                    var newContent = ""
                    switch (macro) {
                        case "role":
                            pageContent = replaceRoleRelatedMacro(page, pageContent, line, macroResult, heading, rolePageMap, keywordPageMap,logger)
                            break;
                        case "related":
                            newContent = replaceRelatedMacro(page, pageContent, line, macroResult, heading, keywordPageMap, macrosRegEx)
                            break;
                        case "reference":
                            newContent = replaceReferenceMacro(page, pageContent, line, macroResult, heading, keywordPageMap, macrosRegEx)
                            break;
                        case "pages":
                            newContent = replacePagesMacro(page, pageContent, line, macroResult, heading, pages)
                            break;

                    }
                }
            }
        }
        page.contents = Buffer.from(pageContent.join("\n"))
        // for (let re of macrosRegEx) {
        //     re.exec(pageContent)
        // }
    }
    return pages

}

function replaceRoleRelatedMacro( page, pageContent, line, macroResult, heading, rolePageMap, keywordPageMap, logger ) {
    var resultValues = parseCustomXrefMacro(macroResult, line, heading)
    var exclusionSet = excludeSelf(page)
    var content = ""
    if (resultValues.parameters) {
        content = "\n"
    }
    else {
        content = resultValues.newLine
    }
    resultValues.attributes.split(",").forEach((el) => {
        const elTrimmed = el.trim()
        if (rolePageMap.has(elTrimmed)) {
            rolePageMap.get(elTrimmed).forEach((rolePage) => {
                var pageRelevant = true
                if (resultValues.parameters) {
                    pageRelevant = false
                    const keywords = getAllKeywordsAsArray(rolePage)
                    if (keywords) {
                        for (var k of resultValues.parameters.split(",").map(x => x.trim())) {
                            if (keywords[1].split(",").map(x => x.trim()).indexOf(k)>-1) {
                                pageRelevant = true
                            }
                        }
                    }
                }
                if (!exclusionSet.has(rolePage) && pageRelevant) {
                    const moduleName = rolePage.src.module
                    const modulePath = rolePage.src.relative
                    const linkText = `xref:${moduleName}:${modulePath}[]`
                    content = content.concat("\n",addNewBulletPoint(linkText))
                }
            })
        }
        else {
            logger.warn("Role not found")
        }

    })
    pageContent.splice(pageContent.indexOf(line),1,content)

    return (pageContent)
}

function replaceRelatedMacro( page, pageContent, line, macroResult, heading, keywordPageMap ) {
    var resultValues = parseCustomXrefMacro(macroResult, line, heading)
    var exclusionSet = excludeSelf(page)
    exclusionSet = excludeNegatedAttributes(exclusionSet, resultValues.attributes, keywordPageMap)
    var content = resultValues.newLine
    resultValues.attributes.split(",").forEach((el) => {
        const elTrimmed = el.trim()
        if (elTrimmed.startsWith("!")) {

        }
        else if (keywordPageMap.has(elTrimmed)) {
            keywordPageMap.get(elTrimmed).forEach((keywordPage) => {
                if (!exclusionSet.has(keywordPage)) {
                    const moduleName = keywordPage.src.module
                    const modulePath = keywordPage.src.relative
                    const linkText = `xref:${moduleName}:${modulePath}[]`
                    content = content.concat("\n",addNewBulletPoint(linkText))
                }
            })
        }
        else {
            // logger.warn({ file: page.src, source: page.src.origin }, 'No page for keyword found')
            const filename = page.src
            console.log(`No page for keyword ${el} found: file: ${filename}`)
            console.log(exclusionSet)
            console.log(keywordPageMap.keys())
        }

    })
    pageContent.splice(pageContent.indexOf(line),1,content)

    return (pageContent)
}

function replaceReferenceMacro( page, pageContent, line, macroResult, heading, keywordPageMap ) {
    return (replaceRelatedMacro(page, pageContent, line, macroResult, heading, keywordPageMap))
}

function replacePagesMacro( page, pageContent, line, macroResult, heading, pages ) {
    var resultValues = parseCustomXrefMacro(macroResult, line, heading)
    var exclusionSet = excludeSelf(page)
    const parameterArray = resultValues.parameters.split(",")
    var content = resultValues.newLine

    var doAll = false
    var targetPath = page.dirname
    for (let par of parameterArray) {
        var param = par.trim()
        if (param === "all") {
            doAll = true
        }
        else {
            param = param.split("=").map((e) => {
                e = e.trim()
                return (e);
            })
            if (param.indexOf("path") > -1) {
                const path = param[1]
                targetPath=targetPath+"/"+path
            }
        }
    }
    const childPagesArray = getChildPagesOfPath(pages, targetPath, doAll)

    for (let child of childPagesArray) {
        if (!exclusionSet.has(child)) {
            const moduleName = child.src.module;
            const modulePath = child.src.relative;
            const linkText = `xref:${moduleName}:${modulePath}[]`
            content = content.concat("\n",addNewBulletPoint(linkText))
        }
    }
    pageContent.splice(pageContent.indexOf(line),1,content)

    return(pageContent)
}

function parseCustomXrefMacro( macroResult, line, heading ) {
    var resultValues = new Object;
    resultValues.attributes = macroResult[1]
    resultValues.parameters = macroResult[2]
    resultValues.indexStart = macroResult.index
    resultValues.indexStop = line.indexOf("]",resultValues.indexStart) +1

    const newLine = line.substring(0,resultValues.indexStart) + heading + " "+ line.substring(resultValues.indexStop)
    resultValues.newLine = newLine

    return resultValues
}

function addNewBulletPoint( content ) {
    return "* ".concat(content)
}

function excludeSelf( page, exclusionSet = new Set() ) {
    exclusionSet.add(page)
    return exclusionSet
}

function findAllOccurrencesOfCustomMacroInPage( page, macro, macrosRegEx ) {
    const re = macrosRegEx.filter(entry => {
        return (entry.macro === macro)
    }).re

    return(getAllOccurencesForRegEx(page, re))
}

function getAllKeywordsAsArray( page ) {
    var re = /^\s*:keywords:(.*)/
    var content = page.contents.toString().split("\n")
    var i = 0
    var res;
    for (let line of content) {
        res = re.exec(line)
        if (res){
            break;
        }
        i++;
    }
    res.line = i
    return(res)
}

function getAllOccurencesForRegEx( page, re ) {
    var content = page.contents.toString()
    var m;
    var results = new Array();
    do {
        m = re.exec(content)
        if (m) {
            results.push(m)
        }
    } while(m)

    return (results)
}

function excludeNegatedAttributes( exclusionSet = new Set(), attributes, keywordPageMap ) {
    const attributesArray = attributes.split(",").filter(attr => attr.trim().startsWith("!"))
    for (let attr of attributesArray) {
        let attrPage;
        attr = attr.slice(1)
        if (keywordPageMap.has(attr)) {
            attrPage = keywordPageMap.get(attr)
            exclusionSet = new Set([...exclusionSet,...attrPage])
        }
    }
    return (exclusionSet)
}

function getChildPagesOfPath( pages, path, doAll=false ) {
    var childPages = new Array();

    if (doAll) {
        pages.forEach((page) => {
            if (page.dirname.indexOf(path) >-1) {
                childPages.push(page)
            }
        })
    }
    else {
        pages.forEach((page) => {
            if (page.dirname === path) {
                childPages.push(page)
            }
        })
    }

    return (childPages);

}

function createVirtualFilesForFolders( contentCatalog, component, version, module, pages, modulePath ) {
    var folderFiles = new Object()
    const base = pages[0].base

    pages.forEach((page) => {
        let relativePath = ""
        if (page.src.basename !== page.src.relative) {
            relativePath = page.src.relative.replace("/"+page.src.basename,"")
            while (true) {
                if (!relativePath ) {
                    return false
                }
                if (Object.keys(folderFiles).indexOf(relativePath) < 0) {
                    let folderName = relativePath
                    if (folderName.startsWith("_") || folderName.startsWith(".")) {
                        return false;
                    }
                    const start = folderName.lastIndexOf("/")
                    if (start > 0) {
                        folderName = folderName.slice(start+1)
                    }
                    let parentPath = relativePath.slice(0,relativePath.lastIndexOf(folderName))
                    parentPath = parentPath.endsWith("/") ? parentPath.slice(0,-1) : parentPath
                    const folderFileName = folderName+".adoc"

                    if(pages.findIndex((element,index) => {
                        if(element.src.relative === parentPath+"/"+folderFileName || element.src.relative === folderFileName) {
                            return true
                        }
                    }) === -1) {
                        let content = new Array(
                            "= "+capitalizeFirstLetter(folderName).replace("_"," "),
                            ":description: Auto-generated folder page",
                            ":keywords: generated, autonav",
                            "",
                            `pages::[path=${folderName}]`
                        )
                        let newFile = createNewVirtualFile( contentCatalog, folderFileName, parentPath, module, component, version, content.join("\n"), base )
                        folderFiles[relativePath]=newFile
                    }
                    const relativePathNew = relativePath.replace("/"+folderName,"")
                    if (relativePathNew === relativePath) {
                        return false
                    }
                    else {
                        relativePath = relativePathNew
                    }
                }
                else {
                    return false
                }
            }
        }
    })
    return (Array.from(Object.values(folderFiles)))
}

function createKeywordsOverviewPage( keywordOverviewPageRequested, contentCatalog, pages, keywordPageMap, targetPath, targetName, targetModule, component, version ) {
    if (!keywordOverviewPageRequested) {
        return pages
    }
    const standardContent = new Array(
        "= Used keywords In ASAM Project Guide",
        ":description: Automatically generated overview over all keywords used throughout this Project Guide.",
        ":keywords: generated,keywords,keyword-overview-page,link-concept,structure",
        ":page-partial:",
        "",
        "This page is an automatically generated list of all keywords used throught this Project Guide.",
        "Every keyword has its own subsection and contains a link to each page as well as the original filename, path and module in the repository.",
        "",
        "== List of keywords",
        ""
    )
    let myBase;
    for (let entry of [...keywordPageMap.entries()].sort()) {
        let val = entry[1].entries().next().value[0]
        myBase = val.base
        if (targetPath !== "" && !targetPath.endsWith("/")){
            targetPath = targetPath+"/"
        }

        if (entry[1].size === 1 && val.src.relative === targetPath+targetName && val.src.module === targetModule) {
            continue;
        }
        standardContent.push("=== "+entry[0])
        for (let value of entry[1]) {
            if (value.src.basename === targetName && value.src.relative === targetPath && value.src.module === targetModule) {
                continue;
            }
            standardContent.push("* xref:"+value.src.module+":"+value.src.relative+"[]")
        }
        standardContent.push("")
    }

    const relative = targetPath === "" ? targetName : targetPath+"/"+targetName
    let existingFile = contentCatalog.findBy({component: component, version: version, module: targetModule, relative: relative})
    if (existingFile.length) {
        existingFile[0].contents = Buffer.from(standardContent.join("\n"))
        return pages

    }
    else {
        let newFile = createNewVirtualFile(contentCatalog, targetName, targetPath, targetModule, component, version, standardContent.join("\n"),myBase)
        return [...pages,newFile]
    }


}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

function createNewVirtualFile( contentCatalog, filename, path, module, component, version, content, base, type="page" ) {
    if (typeof content === 'string' || content instanceof String){
        content = Buffer.from(content)
    }
    let typeFolder;
    let mediaType
    switch(type){
        case "page":
            typeFolder = "/pages/"
            mediaType = "text/html"
            break;
        case "partial":
            typeFolder = "/partials/"
            mediaType = "text/html"
            break;
    }
    if(!path.endsWith("/") && path !== ""){
        path = path+"/"
    }
    let newFile = new File({ base: base, path: "modules/"+module+typeFolder+path+filename, contents: content, mediaType: mediaType})
    let moduleRootPath = path=== "/" ? ".." : path.replace(/([^//])*/,"..")+".."
    newFile.src = {}
    Object.assign(newFile.src, { path: newFile.path, basename: newFile.basename, stem: newFile.stem, extname: newFile.extname, family: type, relative: path+filename, mediaType: 'text/asciidoc', component: component, version: version, module: module, moduleRootPath: moduleRootPath })

    contentCatalog.addFile(newFile)
    return (newFile)
}

function pageIsFolderFile( page ) {
    return (page.src.stem === page.out.dirname.slice(page.out.dirname.lastIndexOf("/")+1))
}

function replaceAutonavMacro( contentCatalog, pages, nav, component, version, findModuleMainPage=true ) {
    const modulePath = nav.dirname+"/pages"
    const moduleName = nav.src.module
    let modulePages = pages.filter(page => page.src.module === moduleName)

    let addedVirtualPages = createVirtualFilesForFolders(contentCatalog,component,version,moduleName,modulePages,modulePath)
    modulePages = [...modulePages,...addedVirtualPages]
    pages = [...pages,...addedVirtualPages]

    let moduleStartPage = modulePages[0].basename
    const rootLevelPages = modulePages.filter(x => x.src.moduleRootPath === "..").map(x => x.stem)

    if (rootLevelPages.indexOf(moduleName) > -1) {
        moduleStartPage = moduleName+".adoc"
    }
    else if (rootLevelPages.indexOf("index") > -1){
        moduleStartPage = rootLevelPages[rootLevelPages.indexOf("index")]
    }
    else if (rootLevelPages.indexOf("main") > -1){
        moduleStartPage = "main.adoc"
    }

    let navBody = [""]
    if (findModuleMainPage) {
        navBody = ["* xref:"+moduleStartPage+"[]"]
    }

    modulePages.sort((a,b) => {
        var relA = a.src.path.replace(".adoc","").split("/")
        var relB = b.src.path.replace(".adoc","").split("/")
        var l = Math.max(relA.length, relB.length)
        for (var i = 0; i < l; i += 1) {
            if (!(i in relA)) return -1
            if (!(i in relB)) return 1
            if (relA[i] > relB[i]) return +1
            if (relA[i] < relB[i]) return -1
        }
    })

    modulePages.forEach( (page) => {
        let currentLevel = findModuleMainPage ? 2 : 1
        let moduleRootPath = page.src.moduleRootPath
        if (moduleRootPath.indexOf("/")>-1 ) {
            currentLevel = currentLevel-1 + moduleRootPath.split("/").length
        }

        let line = "*".repeat(currentLevel) + " xref:"+page.src.relative+"[]"

        if ((page.src.relative !== moduleStartPage || !findModuleMainPage) && isPublishableFile(page))  {
            navBody.push(line)
        }
    })
    nav.contents = Buffer.from(navBody.join("\n"))
    return pages
}

function isPublishableFile( page ) {
    return (page.src.relative.indexOf("/_") < 0 && page.src.relative.indexOf("/.") < 0 && !page.src.relative.startsWith("_") && !page.src.relative.startsWith("."))
}

function generatePageNumberBasedOnNavigation(pages, navFiles) {
    let chapterIndex = "0."
    navFiles.forEach(nav => {
        for (let line of nav._contents.toString().split("\n")) {
            const indexOfXref = line.indexOf("xref:")
            if (indexOfXref > 0) {
                const endOfXref = line.indexOf("[")
                const targetFile = line.slice(indexOfXref+5,endOfXref)
                let foundPage = pages.filter(x => x.src.relative === targetFile)
                if (foundPage) {
                    const level = line.lastIndexOf("*",indexOfXref) + 1
                    let chapterElements = chapterIndex.split(".")
                    const currentChapterIndexLength = chapterElements.length - 1

                    if (currentChapterIndexLength < level) {
                        for (let i in [...Array(level-currentChapterIndexLength)]) {
                            chapterElements.splice(-1,0,"1")
                        }
                    }
                    else {
                        chapterElements[level-1] = (parseInt(chapterElements[level-1]) + 1).toString()
                        if (currentChapterIndexLength > level) {
                            chapterElements = chapterElements.slice(0,level).concat([""])
                        }
                    }
                    chapterIndex = chapterElements.join(".")

                    let newContent = foundPage[0]._contents.toString().split("\n")
                    newContent.splice(1,0,":titleoffset: "+ chapterIndex)
                    foundPage[0]._contents = Buffer.from(newContent.join("\n"))

                }
            }

        }
    })
}