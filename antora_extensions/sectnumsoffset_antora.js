module.exports = function (registry) {
    registry.treeProcessor(function () {
      var self = this
      var verbose = false
      self.process(function (doc) {
        // Check if sectnums and sectnumoffset is found. Only act if true
        // if (doc.getTitle() && doc.getTitle().indexOf("General Architecture")>-1) {verbose = true}
        if (verbose){console.log("Title: ",doc.getTitle())}
        if (verbose){console.log("has imageoffset attribute: ",doc.hasAttribute("imageoffset"))}
        if (verbose){console.log("has tableoffset attribute: ",doc.hasAttribute("tableoffset"))}
        if (doc.hasAttribute("sectnums") && (doc.hasAttribute("sectnumoffset") || doc.hasAttribute("titleoffset") || doc.hasAttribute("imageoffset") || doc.hasAttribute("tableoffset"))) {
            let offsetValue = Math.abs(doc.getAttribute("sectnumoffset",0))
            let pageTitle = doc.getTitle()
            let titleOffset = doc.getAttribute("titleoffset",null)
            let titlePrefix = doc.getAttribute("titleprefix","")
            let imageOffset = Math.abs(doc.getAttribute("imageoffset",0))
            let tableOffset = Math.abs(doc.getAttribute("tableoffset",0))

            if (verbose){console.log("imageOffset attribute: ",imageOffset)}
            if (verbose){console.log("tableoffset attribute: ",tableOffset)}

            if (titlePrefix) {
                pageTitle = doc.setTitle(titlePrefix + " " + pageTitle)
            }
            else if (titleOffset) {
                pageTitle = doc.setTitle(titleOffset+" "+pageTitle)
            }
            titleOffset = titleOffset.endsWith(".") ? titleOffset : titleOffset+"."
            doc.getSections().filter(s => s.getLevel() === 1).forEach(sect => {
                offsetValue = 1 + offsetValue
                sect.setNumeral(titleOffset+offsetValue)
            })
            imageOffset = updateImageOffset(doc, imageOffset, verbose)
            tableOffset = updateTableOffset(doc, tableOffset, verbose)
        }
      })
    })
    function updateImageOffset( doc, imageOffset, verbose=false ) {
        let newImageOffset = imageOffset
        for (let block of doc.getBlocks()) {
            if (verbose){console.log("block: ",block.getNodeName())}
            if (block.getNodeName() === "section" || block.getNodeName() === "preamble") {
                newImageOffset = updateImageOffset( block, newImageOffset, verbose)
            }
            else if(block.getNodeName() === "image") {
                newImageOffset = 1 + newImageOffset
                const oldNumeral = block.getNumeral()
                block.setNumeral(newImageOffset)
                if(block.getCaption()) {
                    block.setCaption(block.getCaption().replace(oldNumeral,newImageOffset))
            }
            }
        }
        return (newImageOffset)
    }
    function updateTableOffset( doc, tableOffset, verbose=false ) {
        let newTableOffset = tableOffset
        for (let block of doc.getBlocks()) {
            if (verbose){console.log("block: ",block.getNodeName())}
            if (block.getNodeName() === "section" || block.getNodeName() === "preamble") {
                newTableOffset = updateTableOffset( block, newTableOffset, verbose)
            }
            else if(block.getNodeName() === "table") {
                newTableOffset = 1 + newTableOffset
                block.setNumeral(newTableOffset)
                if(block.getCaption()) {
                    block.setCaption("Table "+newTableOffset+". ")
            }
            }
        }
        return (newTableOffset)
    }
  }