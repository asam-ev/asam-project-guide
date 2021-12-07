import sys, getopt
from os import walk
from helpers import asciidoc as A
from helpers import constants as C


def main(argv):
    parameters = "p:"
    parameters_long = ["path="]
    path = "../"
    excluded_directory_names = ["assets","examples","partials"]

    try:
        opts, args = getopt.getopt(argv,parameters,parameters_long)
    except:
        print("Use '-p <path>' or '--path <path>' to specifiy the path the script shall look into.")

    for opt,arg in opts:
        if opt in ("-p","--path"):
            path = path + arg


    found_files = []
    for (dirpath, dirnames, filenames) in walk(path):
        if(dirpath[-1] != C.PATH_DIVIDER):
            dirpath += C.PATH_DIVIDER

        skip = False
        dirpath = dirpath.replace("\\",C.PATH_DIVIDER)
        for exc in excluded_directory_names:
            if dirpath.find(C.PATH_DIVIDER+exc)>-1:
                skip = True
                break

        if skip:
            print("Skipped path "+dirpath)
            continue

        else:
            for filename in filenames:
                if filename.endswith(C.ASCIIDOC_FILEEXTENSION):
                    asciidoc_file = A.AsciiDocContent(dirpath,filename)
                    if asciidoc_file.has_module():
                        # print("found attributes {attr} in {file}".format(attr = attributes, file = filename))
                        found_files.append(asciidoc_file)

    attributes_file = found_files[0].write_attributes_to_file()
    if not attributes_file in found_files:
        found_files.append(attributes_file)

    for afile in found_files:
        macro_found = afile.find_reference_macro()
        macro_found = afile.find_related_topics_macro()
        macro_found = afile.find_role_related_topics_macro()

    for afile in found_files:
        if afile in found_files[0].reference_macro_occurence_list:
            afile.find_reference_macro(find_and_replace=True)

        if afile in found_files[0].related_topics_macro_occurence_list:
            afile.find_related_topics_macro(find_and_replace=True)

        if afile in found_files[0].role_related_topics_macro_occurence_list:
            afile.find_role_related_topics_macro(find_and_replace=True)

        afile.write_to_file()
        afile.revert_macro_substitution()
        afile.write_to_file(filename=afile.filename+"1")

    print("CREATE LINKING CONCEPT DOCUMENTS")
    found_files[0].create_linking_concept()


if __name__ == "__main__":
    main(sys.argv[1:])
