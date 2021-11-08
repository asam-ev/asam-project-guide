import sys, getopt
import os
from os import walk
# import lib.AdocWriter

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

    replace_file_type = ".adoc1"

    remove_file_type = ".adoc2"

    found_files = []

    for (dirpath, dirnames, filenames) in walk(path):
        if(dirpath[-1] != "/"):
            dirpath += "/"

        skip = False
        dirpath = dirpath.replace("\\","/")
        for exc in excluded_directory_names:
            if dirpath.find("/"+exc)>-1:
                skip = True
                break

        if skip:
            print("Skipped path "+dirpath)
            continue

        else:
            for filename in filenames:
                if filename.endswith(replace_file_type) and os.path.isfile(dirpath+filename[:-1]):
                    os.remove(dirpath+filename[:-1])
                    os.rename(dirpath+filename,dirpath+filename[:-1])
                elif filename.endswith(remove_file_type) and os.path.isfile(dirpath+filename[:-1]):
                    os.remove(dirpath+filename[:-1])
                    os.remove(dirpath+filename)

if __name__ == "__main__":
    main(sys.argv[1:])
