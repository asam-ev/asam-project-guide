'use strict'
const File = require('./file')
// const classifyContent = require('@antora/content-classifier')

module.exports.register = function ({ config }) {
    const { numberedTitles, sectionNumberStyle, addToNavigation, unlistedPagesHeading = 'Unlisted Pages' } = config
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
        { macro: "pages", heading: "== Pages\n:pagesmacro:\n\n" },
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
                let anchorPageMap = getAnchorPageMapForPages(pages, navFiles)
                pages = createKeywordsOverviewPage(keywordOverviewPageRequested, contentCatalog, pages, keywordPageMap, targetPath, targetName, targetModule, component, version)
                keywordPageMap = getKeywordPageMapForPages(useKeywords,pages)
                pages = findAndReplaceCustomASAMMacros( contentCatalog, pages, navFiles, keywordPageMap, rolePageMap, macrosRegEx, macrosHeadings, logger, component, version )
                keywordPageMap = getKeywordPageMapForPages(useKeywords,pages)
                pages = createKeywordsOverviewPage(keywordOverviewPageRequested, contentCatalog, pages, keywordPageMap, targetPath, targetName, targetModule, component, version)
                navFiles = contentCatalog.findBy({ component, version, family: 'nav'})

                if (numberedTitles) {
                    const style = sectionNumberStyle ? sectionNumberStyle : "default"
                    let appendixCaption = "Appendix"
                    let appendixOffset = 0
                    const componentAttributes = contentCatalog.getComponents().filter(x => x.name === component)[0].asciidoc.attributes
                    if (Object.keys(componentAttributes).indexOf("appendix-caption") > -1) {
                        appendixCaption = componentAttributes["appendix-caption"]
                    }
                    if (Object.keys(componentAttributes).indexOf("appendix-offset") > -1) {
                        appendixOffset = componentAttributes["appendix-offset"]
                    }
                    generatePageNumberBasedOnNavigation(pages, navFiles, style, appendixCaption, appendixOffset)
                }
                if (anchorPageMap.size > 0) {
                    pages = findAndReplaceLocalReferencesToGlobalAnchors( anchorPageMap, pages )
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
    content += "\n"
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

function generatePageNumberBasedOnNavigation(pages, navFiles, styleSettings, appendixCaption, appendixOffset) {
    const reStartLevel = /:start-level: ([0-9]*)/;
    const reResetLevelOffset = /:reset-level-offset:/;

    let currentRole = "default"
    let generateNumbers = true
    const style = styleSettings.toLowerCase()
    let chapterIndex = setStartingChapterIndex(style,"0")
    let imageIndex = 0,
        tableIndex = 0
    navFiles.sort((a,b) => {
        return a.nav.index - b.nav.index
    })
    navFiles.forEach(nav => {
        const navContentSum = nav._contents.toString()
        let content = navContentSum.split("\n")
        if (navContentSum.match(reResetLevelOffset)) {
            chapterIndex = setStartingChapterIndex(style,"0")
        }
        let startLevel = navContentSum.match(reStartLevel) && navContentSum.match(reStartLevel)[1] ? navContentSum.match(reStartLevel)[1] : 1
        for (let line of nav._contents.toString().split("\n")) {
            let hasChanged = false;
            [generateNumbers, content, hasChanged] = checkForSectnumsAttribute(content,line,generateNumbers)
            if (hasChanged) {continue;}
            [currentRole, content, hasChanged] = checkForRoleInLine(content, line, currentRole)
            if (hasChanged) {continue;}

            switch (currentRole) {
                case "abstract":
                    currentRole = "default";
                    break;
                case "appendix":
                    [content, chapterIndex, imageIndex, tableIndex, generateNumbers,currentRole] = handleAppendix(nav, pages,content, line, generateNumbers, startLevel, chapterIndex, imageIndex, tableIndex, style, appendixCaption, appendixOffset);
                    break;
                case "glossary":
                    currentRole = "default";
                    break;
                case "bibliography":
                    [currentRole, imageIndex, tableIndex] = handleBibliography(nav, pages, line, imageIndex, tableIndex)
                    break;
                case "index":
                    currentRole = "default";
                    break;
                case "preface":
                    [currentRole, imageIndex, tableIndex]  = handlePreface(nav, pages, line, imageIndex, tableIndex)
                    break;
                case "default":
                    [content, chapterIndex, imageIndex, tableIndex, generateNumbers,currentRole] = tryApplyingPageAndSectionNumberValuesToPage(nav, pages,content, line, generateNumbers, startLevel, chapterIndex, imageIndex, tableIndex, style)
                    break;
            }
        }
        nav._contents = Buffer.from(content.join("\n"))
    })
}

function setStartingChapterIndex( style, value ) {
    return style === "iso" ? value : value+"."
}

function tryApplyingPageAndSectionNumberValuesToPage( nav, pages, content, line, generateNumbers, startLevel, chapterIndex, imageIndex, tableIndex, style, option="default", appendixCaption="" ) {
    let newImageIndex = imageIndex
    let newTableIndex = tableIndex
    let numberOfLevelTwoSections = 0
    const indexOfXref = line.indexOf("xref:")
    const level = indexOfXref > 0 ? line.lastIndexOf("*",indexOfXref) + 1 : line.lastIndexOf("*") + 1
    const targetLevel = level - startLevel + 1
    // Execute only if either a cross reference or a bullet point was found
    if (indexOfXref > 0 || level >= startLevel) {
        // Execute if no xref was found
        if (indexOfXref <= 0) {
            if (!generateNumbers) {
                return [content, chapterIndex, newImageIndex, newTableIndex, !generateNumbers,"default"]
            }
            chapterIndex = determineNextChapterIndex(targetLevel, chapterIndex, style)
            const changedLine = line.slice(0,level) + " " + chapterIndex + line.slice(level)
            content[content.indexOf(line)] = changedLine
        }
        // Execute if xref was found
        else if (level >= startLevel) {
            let expectedNavtitleIndex = 0
            let expectedReftextIndex = 0
            let number
            let foundPage = determinePageForXrefInLine(line, indexOfXref, pages, nav)
            // Only execute if at least one matching page was found
            if (foundPage.length > 0) {
                let page = foundPage[0]
                if (!generateNumbers) {
                    unsetSectnumsAttributeInFile(page)
                    let [a,b,c] = updateImageAndTableIndex(pages, page, imageIndex, tableIndex)
                    return [content, chapterIndex, a, b,!generateNumbers, "default"]
                }
                chapterIndex = determineNextChapterIndex(targetLevel, chapterIndex, style, appendixCaption)
                addTitleoffsetAttributeToPage( page, chapterIndex)
                let [a,b,c] = updateImageAndTableIndex(pages, page, imageIndex, tableIndex)
                newImageIndex = a
                newTableIndex = b
                numberOfLevelTwoSections = c
                let [newContent, indexOfTitle, indexOfNavtitle, indexOfReftext] = getPageContentForExtensionFeatures(page)
                if (appendixCaption) {
                    const targetIndex = style === "iso" ? chapterIndex.split(".") : chapterIndex.split(".").slice(0,-1)
                    newContent.splice(indexOfTitle+2,0,":titleprefix: "+ appendixCaption+" "+targetIndex.join(".")+":")
                }
                if (option !== "default") {
                    newContent.splice(indexOfTitle,0,"["+option+"]")
                    expectedNavtitleIndex += 1
                    expectedReftextIndex += 1
                    option = "default"
                }
                if (indexOfNavtitle > expectedNavtitleIndex) {
                    const index = newContent[indexOfNavtitle].indexOf(":navtitle:") + ":navtitle:".length + 1
                    newContent[indexOfNavtitle] = newContent[indexOfNavtitle].slice(0,index) + chapterIndex + " " + newContent[indexOfNavtitle].slice(index)
                }
                if (indexOfReftext > expectedReftextIndex) {
                    const index = newContent[indexOfReftext].indexOf(":reftext:") + ":reftext:".length + 1
                    newContent[indexOfReftext] = newContent[indexOfReftext].slice(0,index) + chapterIndex + " " + newContent[indexOfReftext].slice(index)
                }
                page._contents = Buffer.from(newContent.join("\n"))
                const newIndex = style === "iso" ? chapterIndex +"."+ (numberOfLevelTwoSections-1) : chapterIndex + (numberOfLevelTwoSections-1) +"."
                chapterIndex = determineNextChapterIndex(targetLevel+1, newIndex, style, appendixCaption)
            }
        }
    }
    return [content, chapterIndex, newImageIndex, newTableIndex,generateNumbers, option]
}

function determinePageForXrefInLine(line, indexOfXref, pages, nav) {
    const endOfXref = line.indexOf("[")
    const targetFile = line.slice(indexOfXref + 5, endOfXref)
    let foundPage = pages.filter(x => x.src.relative === targetFile && x.src.module === nav.src.module)
    return foundPage
}

function determineNextChapterIndex( targetLevel, chapterIndex="0.", style, appendixCaption="" ) {
    let chapterElements = chapterIndex.split(".")
    if (style !== "iso") {chapterElements.pop()}
    const currentChapterIndexLength = Math.max(1,chapterElements.length)
    if (appendixCaption) {
        if (targetLevel === 1) {
            if (isNaN(parseInt(chapterElements[0]))) {
                chapterElements[0] = String.fromCharCode(chapterElements[0].charCodeAt(0) + 1)
            }
            else {
                chapterElements[0] = "A"
            }
        }
    }
    // Add 1s to the end if the current number is shorter than the target number
    if (currentChapterIndexLength < targetLevel) {
        for (let i in [...Array(targetLevel-currentChapterIndexLength)]) {
            chapterElements.splice(-1,0,"1")
        }
    }
    else {
        // Increase if the targetlevel is a number (letters are increased above)
        if (!isNaN(parseInt(chapterElements[targetLevel-1]))) {
            chapterElements[targetLevel-1] = (parseInt(chapterElements[targetLevel-1]) + 1).toString()
        }
        // Cut all elements beyond the target
        if (currentChapterIndexLength > targetLevel) {
            chapterElements = chapterElements.slice(0,targetLevel)
        }
    }
    if (style !== "iso") {
        chapterElements.push("")
    }
    chapterIndex = chapterElements.join(".")
    return chapterIndex
}

function getAnchorsFromPage( pages, page ) {
    var re = /\[\[([^\],]+)(,([^\]]*))?\]\]|\[#([^\]]*)\]|anchor:([^\[]+)\[/
    var resultMap = new Map
    var results = []
    let ignoreLine = false
    for (var line of page.contents.toString().split("\n")) {
        if (line.indexOf("ifndef::") > -1 && line.indexOf("use-antora-rules") > -1) {
            ignoreLine = true
        }
        else if (ignoreLine && line.indexOf("endif::") > -1) {
            ignoreLine = false
        }
        if (ignoreLine) {continue;}
        const includeSearchResult = line.match(/^\s*include::([^\[]+)\[(leveloffset=\+(\d+))?\]/)
        if (includeSearchResult && includeSearchResult.length > 0) {
            const targetPage = determineTargetPageFromIncludeMacro ( pages, page, includeSearchResult[1] )
            if (targetPage) {
                const partialAnchorMap = getAnchorsFromPage(pages,targetPage)
                resultMap = addOrUpdateAnchorMapEntry( resultMap, partialAnchorMap, page )
            }
        }
        else {
            const result = re.exec(line);
            if (result) {
                results.push(result)
            }
        }
    }
    if (results) {
        for (let entry of results) {
            const e1 = entry[1]
            const e2 = entry[4]
            const e3 = entry[5]

            const resultValue = e1 ? e1 : e2 ? e2 : e3
            if (resultMap.has(resultValue)) {
                resultMap = updateMapEntry(resultMap,resultValue,page)
            }
            else {
                resultMap.set(resultValue, new Set([page]))
            }
        }
    }
    return resultMap
}

function getAnchorPageMapForPages( pages, navFiles ) {
    var anchorMap = new Map;
    for (let page of pages.filter((page) => page.out)) {
        let hasPriority = false
        for (let nav of navFiles) {
            if (nav.contents.toString().indexOf(page.src.relative) > -1) {
                hasPriority = true;
                break;
            }
        }
        let updateMap = getAnchorsFromPage(pages, page)
        if (updateMap && updateMap.size > 0) {
            if (hasPriority) {
                anchorMap = addOrUpdateAnchorMapEntry(updateMap,anchorMap)
            }
            else {
                anchorMap = addOrUpdateAnchorMapEntry(anchorMap, updateMap)
            }
        }
    }
    return anchorMap
}

function addOrUpdateAnchorMapEntry( anchorMap, updateMap, overridePage = null ) {
    for (let key of updateMap.keys()) {
        if (overridePage) {
            updateMap.set(key, new Set([overridePage]))
        }
        if (anchorMap.has(key)) {
            const mergedSet = new Set([...anchorMap.get(key),...updateMap.get(key)])
            anchorMap = anchorMap.set(key, mergedSet)
        }
        else {
            anchorMap.set(key,updateMap.get(key))
        }
    }
    return anchorMap
}

function findAndReplaceLocalReferencesToGlobalAnchors( anchorMap, pages ) {
    if (anchorMap.size === 0) {return pages}
    const re = /<<([^>,]+)(,\s*([^>]+))?>>/g
    const reAlt = /xref:{1,2}#([^\[]+)\[(([^\]]*))\]/gm
    pages.forEach(page => {
        let content = page.contents.toString()
        let references = [...content.matchAll(re)]
        const referencesAlt = [...content.matchAll(reAlt)]
        if (references.length < 1 ) {references = referencesAlt}
        else {
            if (referencesAlt.length > 0) {references = references + referencesAlt}
        }
        references.forEach(ref => {
            if (anchorMap.get(ref[1])) {
                const referencePage = [...anchorMap.get(ref[1])][0]
                if (page !== referencePage) {
                    let [autoAltText, altLink] = getReferenceNameFromSource( pages, referencePage, ref[1] )
                    const altText = ref[3] ? ref[3] : autoAltText
                    const anchorLink = altLink ? altLink : ref[1]
                    const replacementXref = "xref:"+referencePage.src.component+":"+referencePage.src.module+":"+referencePage.src.relative+"#"+anchorLink+"["+altText+"]"
                    content = content.replace(ref[0],replacementXref)
                }
            }
        })
        page.contents = Buffer.from(content)
    })
    return pages
}

function getReferenceNameFromSource( pages, page, anchor ) {
    const reSectionEqualSigns = /^\s*(=+)\s+(.*)$/m
    const reCaptionLabel = /^\.(\S.+)$/m
    const reAnchorType = /([^-\]]+)-?[^\]]*/m

    let content =page.contents.toString()
    const resultAnchorType = anchor.match(reAnchorType)
    const indexOfAnchor = content.indexOf(anchor)
    const resultForNextHeading = content.slice(indexOfAnchor).match(reSectionEqualSigns)
    // const resultForPreviousHeading = content.slice(0,indexOfAnchor).match(reSectionEqualSigns)
    const resultNextCaption = content.slice(indexOfAnchor).match(reCaptionLabel)
    // Use special anchor formats: sec, top, fig, tab, ...
    let result
    let returnValue = ""
    let altLink

    if (resultAnchorType){
        switch (resultAnchorType[1]) {
            case "fig":
                // console.log("found figure: ", anchor);
                result = resultNextCaption
                // console.log(result[1])
                break;
            case "tab":
                // console.log("found table: ", anchor);
                result = resultNextCaption
                // console.log(result[1])
                break;
            case "top":
                // console.log("found top anchor: ", anchor)
                returnValue = getAltTextFromTitle( page, content )
                break;
            case "sec":
                result = resultForNextHeading
                const pageNumber = getAltNumberFromTitle(page,content)
                let relativeSectionNumber = getRelativeSectionNumberWithIncludes(pages,page,result[1].split("=").length-1,anchor)
                if (relativeSectionNumber.length > 1){
                    relativeSectionNumber[0]=""
                    returnValue = "Section " + pageNumber+relativeSectionNumber.join(".")
                }
                else {
                    returnValue = "Section " + pageNumber
                }
                break;
            default:
                console.log("non-standard anchor type detected: ", anchor)
                returnValue = getAltTextFromTitle( page, content )
                break;
        }
    }
    else {
        returnValue = getAltTextFromTitle( page, content )
    }
    return ([returnValue, altLink])
}

function getRelativeSectionNumberWithIncludes(pages,page,targetSectionLevel,startText="") {
    let currentTargetSectionLevel = targetSectionLevel
    let relativeIndex = startText ? [1] : [0]
    let content = page.contents.toString()
    if (startText){
        const indexType1 = content.indexOf("[#"+startText+"]")
        const indexType2 = content.indexOf("[["+startText+"]]")
        if (indexType1 > -1) {
            content = content.slice(0,indexType1);
        }
        else if(indexType2 > -1) {
            content = content.slice(0,indexType2)
        }
    }
    const reSectionStart = /^(=+)\s[^\n]+/
    content.split("\n").reverse().forEach(line => {
        const sectionSearchResult = line.match(reSectionStart)
        const includeSearchResult = line.match(/^\s*include::([^\[]+)\[(leveloffset=\+(\d+))?\]/)
        if (includeSearchResult && includeSearchResult.length > 0) {
            const leveloffset = includeSearchResult[3] ? targetSectionLevel - includeSearchResult[3] : targetSectionLevel
            if (leveloffset > 0)
            {
                const targetPage = determineTargetPageFromIncludeMacro ( pages, page, includeSearchResult[1] )
                if (targetPage){
                    let includedSectionNumbers = getRelativeSectionNumberWithIncludes(pages,targetPage,leveloffset)
                    for (let i in includedSectionNumbers) {
                        relativeIndex[i] += includedSectionNumbers[i]
                    }
                }
            }
        }
        if (sectionSearchResult && sectionSearchResult.length > 0) {
            const foundSectionLevel = sectionSearchResult[1].split("=").length - 1
            if (foundSectionLevel === currentTargetSectionLevel) {
                relativeIndex[0] = relativeIndex[0] + 1
            }
            else if(foundSectionLevel === currentTargetSectionLevel - 1) {
                relativeIndex.reverse()
                relativeIndex.push(1)
                relativeIndex.reverse()
                currentTargetSectionLevel = foundSectionLevel
            }
            // else {console.log("irrelevant section")}
        }
    })
    return relativeIndex
}

function getAltTextFromTitle( page, content ) {
    const re1 = /:titleprefix:\s*([^\n]+)/m
    const re2 = /:titleoffset:\s*([^\n]+)/m
    const re3 = /^=\s+([^\n\r]+)/m

    let returnValue
    let result = content.match(re1)
    if (!result || result.length <=1) {
        result = content.match(re2)
    }
    const resultAlt = content.match(re3)
    if (result && result.length > 1) {
        returnValue = "Section "+result[1]
    }
    else {
        returnValue = resultAlt && resultAlt.length > 1 ? resultAlt[1] : page.src.stem
    }
    return returnValue
}

function getAltNumberFromTitle( page, content ) {
    let value = getAltTextFromTitle(page,content)
    return value.split(" ")[1]
}

function checkForSectnumsAttribute( content, line, previousValue=true ) {
    const reSectnums = /^\s*:sectnums(!)?:/;
    const result = line.match(reSectnums)
    let returnValue;
    let hasChanged = false
    if (result) {
        returnValue = result[1] ? false : true
        hasChanged = true
        content.splice(content.indexOf(line),1)
    }
    else {
        returnValue = previousValue
    }
    return [returnValue, content, hasChanged]
}

function checkForRoleInLine( content, line, currentRole ) {
    const reRoles = /^\s*\[([^\]]+)\]/;
    const result = line.match(reRoles)
    const returnValue = result ? result[1] : currentRole
    const hasChanged = result ? true : false
    if (result) {
        content.splice(content.indexOf(line),1)
    }
    return [returnValue, content, hasChanged]
}

function getPageContentForExtensionFeatures( page ) {
    const contentSum = page.contents.toString()
    let newContent = contentSum.split("\n")
    let indexOfTitle = 0
    let indexOfNavtitle = -1
    let indexOfReftext = -1
    for(let line of newContent) {
        // Find title
        if (line.startsWith("= ")) {
            indexOfTitle = newContent.indexOf(line)
        }
        // Find level 2 sections
        // Find optional attribute :navtitle:
        else if (line.startsWith(":navtitle:")) {
            indexOfNavtitle = newContent.indexOf(line)
        }
        // Find optional attribute :reftext:
        else if (line.startsWith(":reftext:")) {
            indexOfReftext = newContent.indexOf(line)
        }
    }
    return [newContent, indexOfTitle, indexOfNavtitle, indexOfReftext]
}

function handlePreface( nav, pages,line,imageIndex, tableIndex ) {
    const indexOfXref = line.indexOf("xref:")
    let page = determinePageForXrefInLine(line, indexOfXref, pages, nav)[0]
    unsetSectnumsAttributeInFile(page)
    let [newImageIndex,newTableIndex] = updateImageAndTableIndex(pages, page, imageIndex, tableIndex)
    addSpecialSectionTypeToPage(page, "preface")
    return ["default", newImageIndex, newTableIndex]
}

function handleAppendix( nav, pages, content, line, generateNumbers, startLevel, chapterIndex, imageIndex, tableIndex, style, appendixCaption, appendixOffset ) {
    const appendixStartLevel = isNaN(parseInt(startLevel)+parseInt(appendixOffset)) ? startLevel : (parseInt(startLevel)+parseInt(appendixOffset)).toString()
    return tryApplyingPageAndSectionNumberValuesToPage(nav, pages,content, line, generateNumbers, appendixStartLevel, chapterIndex, imageIndex, tableIndex, style, "appendix", appendixCaption)
}

function handleBibliography(nav, pages, line, imageIndex, tableIndex) {
    const indexOfXref = line.indexOf("xref:")
    let bibliographyPage = determinePageForXrefInLine(line, indexOfXref, pages, nav)
    let page = bibliographyPage[0]
    unsetSectnumsAttributeInFile(page)
    let [newImageIndex,newTableIndex] = updateImageAndTableIndex(pages, page, imageIndex, tableIndex)
    addSpecialSectionTypeToPage(page, "bibliography")
    return ["default", newImageIndex, newTableIndex]
}

function addAttributeWithValueToPage( page, pageContent, indexOfTitle, attribute, value, unset=false ) {
    const attr = unset ? ":"+attribute+"!: "+value : ":"+attribute+": "+value.toString()
    pageContent.splice(indexOfTitle+1,0,attr)
    page.contents = Buffer.from(pageContent.join("\n"))
}

function unsetSectnumsAttributeInFile( page ) {
    let [newContent, indexOfTitle, indexOfNavtitle, indexOfReftext] = getPageContentForExtensionFeatures(page)
    addAttributeWithValueToPage( page, newContent, indexOfTitle, "sectnums", "", true)
}

function addTitleoffsetAttributeToPage( page, value) {
    let [newContent, indexOfTitle, indexOfNavtitle, indexOfReftext] = getPageContentForExtensionFeatures(page)
    addAttributeWithValueToPage(page, newContent, indexOfTitle, "titleoffset", value)
}

function addImageOffsetAttributeToPage( page, value ) {
    let [newContent, indexOfTitle, indexOfNavtitle, indexOfReftext] = getPageContentForExtensionFeatures(page)
    addAttributeWithValueToPage(page, newContent, indexOfTitle, "imageoffset", value)
}

function addTableOffsetAttributeToPage( page, value ) {
    let [newContent, indexOfTitle, indexOfNavtitle, indexOfReftext] = getPageContentForExtensionFeatures(page)
    addAttributeWithValueToPage(page, newContent, indexOfTitle, "tableoffset", value)
}

function updateImageAndTableIndex(pages, page, imageIndex=0, tableIndex=0){
    let newImageIndex = imageIndex
    let newTableIndex = tableIndex
    addImageOffsetAttributeToPage(page, newImageIndex)
    addTableOffsetAttributeToPage(page, newTableIndex)
    let [numberOfLevelTwoSections, numberOfImages, numberOfTables] = getIncludedPagesContentForExtensionFeatures(pages, page)
    newImageIndex += parseInt(numberOfImages)
    newTableIndex += parseInt(numberOfTables)
    return ([newImageIndex,newTableIndex,numberOfLevelTwoSections])
}

function addSpecialSectionTypeToPage( page, specialSectionType ){
    let [newContent, indexOfTitle, indexOfNavtitle, indexOfReftext] = getPageContentForExtensionFeatures(page)
    newContent.splice(indexOfTitle+1,0,"["+specialSectionType+"]")
    page.contents = Buffer.from(newContent.join("\n"))
}

function getIncludedPagesContentForExtensionFeatures( pages, page, leveloffset=0 ) {
    const contentSum = page.contents.toString()
    let newContent = contentSum.split("\n")
    let numberOfLevelTwoSections = 0
    let numberOfImages = 0
    let numberOfTables = 0.
    let ignoreLine = false
    for(let line of newContent) {
        // Find level 2 sections
        if (line.indexOf("ifndef::") > -1 && line.indexOf("use-antora-rules") > -1) {
            ignoreLine = true
        }
        else if (ignoreLine && line.indexOf("endif::") > -1) {
            ignoreLine = false
        }
        if (!ignoreLine)
        {
            if ((leveloffset === 0 && line.startsWith("== ")) || (leveloffset === 1 && line.startsWith("= "))) {
                numberOfLevelTwoSections += 1
            }
            else if (line.match(/^:pagesmacro:/)) {
                numberOfLevelTwoSections -= 1
            }
            else if (line.match(/^\s*include::/)) {
                const re = /^\s*include::([^\[]+)\[(leveloffset=\+(\d+))?/
                let result = line.match(re)
                const includePath = result[1].split("/")
                const includeLeveloffset = result[3] ? parseInt(result[3]) + leveloffset : leveloffset
                let currentPath = page.out.dirname.split("/")
                includePath.forEach(part => {
                    if (part === "..") {currentPath = currentPath.slice(0,-1)}
                    else if (part ===".") {}
                    else {currentPath.push(part)}
                })
                const targetPath = currentPath.join("/")
                if (pages.filter(page => page.out.dirname +"/"+ page.src.basename === targetPath).length > 0) {
                    let includedPage = pages.filter(page => page.out.dirname +"/"+ page.src.basename === targetPath)[0]
                    let [numberOfLevelTwoSectionsIncluded, numberOfImagesIncluded, numberOfTablesIncluded] = getIncludedPagesContentForExtensionFeatures(pages, includedPage, includeLeveloffset)
                    numberOfLevelTwoSections += numberOfLevelTwoSectionsIncluded
                    numberOfImages += numberOfImagesIncluded
                    numberOfTables += numberOfTablesIncluded
                }
            }
            else {
                const reFigures = /\[#fig-[^\]]+\]/g
                if ([...line.matchAll(reFigures)].length > 0) {
                    numberOfImages += [...line.matchAll(reFigures)].length
                }
                const reTables = /\[#tab-[^\]]+\]/g
                if ([...line.matchAll(reTables)].length > 0) {
                    numberOfTables += [...line.matchAll(reTables)].length
                }
            }
        }
    }
    return [numberOfLevelTwoSections, numberOfImages, numberOfTables]
}

function determineTargetPageFromIncludeMacro ( pages, thisPage, includePath ) {
    if (!Array.isArray(includePath)) {
        includePath = includePath.split("/")
    }
    let currentPath = thisPage.out.dirname.split("/")
    includePath.forEach(part => {
        if (part === "..") {currentPath = currentPath.slice(0,-1)}
        else if (part ===".") {}
        else {currentPath.push(part)}
    })
    const targetPath = currentPath.join("/")
    let includedPage = pages.filter(page => page.out && page.out.dirname +"/"+ page.src.basename === targetPath)[0]
    return includedPage
}