import sys, getopt
from shutil import copyfile
from os import walk
import os

def main(argv):

    parameters = "p:m"
    parameters_long = ["path=","module"]
    path = "../"
    filetypes = ["adoc"]
    use_module = False
    module = ""
    module_path = ""
    module_file_created = False

    try:
        opts, args = getopt.getopt(argv,parameters,parameters_long)
    except:
        print("Use '-p <path>' or '--path <path>' to specifiy the path the script shall look into. Use '-m' or '--module' to set the module name (if found) as main item.")

    if not opts:
        print("Use '-p <path>' or '--path <path>' to specifiy the path the script shall look into. Use '-m' or '--module' to set the module name (if found) as main item.")
        exit(1)

    for opt,arg in opts:
        if opt in ("-p","--path"):
            path = path + arg
        elif opt in ("-m", "--module"):
            use_module = True

    base_level = current_level = 1
    relative_path_depth = -1
    path_delimiter = ["/","\\"]

    nav_content = ""
    created_files = []

    # Navigate through folders and files and create content and update lists
    for (dirpath,dirnames,filenames) in walk(path):
        if(dirpath[-1] not in path_delimiter):
            dirpath = dirpath + "\\"

        # Do the initial setup steps (once!)
        relative_path_depth,base_level,nav_content,module,module_path,module_file_created=initial_steps_performed_only_once(relative_path_depth,use_module,dirpath,base_level,nav_content,current_level, created_files,module,module_path,module_file_created)

        # Analyze current directory
        current_level = base_level + dirpath.count('\\') - relative_path_depth
        list_entries = []

        # If folder contains subfolders, check and create new files for each folder where there is no file with the same name in this directory yet.
        if(dirnames):
            for dname in dirnames:
                fname = dirpath+dname+".adoc"
                created = create_pure_navigation_adoc_file(fname,dname,created_files)
                list_entries.append(dname+".adoc")

        current_relative_path = dirpath.replace(path,'')

        # Add found supported files to list
        for f in filenames:
            for type in filetypes:
                if f.endswith(type) and not f[0]=="_" and not f in [x+".adoc" for x in dirnames]:
                    list_entries.append(f)
                    break

        # Sort entries alphabetically
        list_entries.sort()
        temp_nav_content = ""
        path_components = current_relative_path.split("\\")
        parent_path = path
        for c in path_components[:-2]:
            parent_path+=c+"/"

        # If in pages folder
        if not current_relative_path:
            for e in list_entries:
                nav_content += add_xref(current_level,current_relative_path,e)

            if use_module and module_file_created:
                content = add_subdirectories_to_main_file(created_files,module_path+"/pages/"+module+".adoc",list_entries,current_relative_path)

        # If in any subfolder
        else:

            content = add_subdirectories_to_main_file(created_files,parent_path+path_components[-2]+".adoc",list_entries,current_relative_path)
            for line in content:
                temp_nav_content += "*"*current_level + line

            index = nav_content.find(path_components[-2]+".adoc[]\n") + len(path_components[-2]+".adoc[]\n")
            nav_content = nav_content[:index] + temp_nav_content + nav_content[index:]

    update_nav_adoc_file(path,nav_content)

    # Note: This is where antora would create the htmls before this script removes the created files again. Alternatively, the files could stay there and not be deleted, just overwritten every time the script is run...
    # INFO: For now, this is done in a cleanup script afterwards.

    for f in created_files:
        with open(f+"2",'w') as file:
            file.write("delete!")

def add_xref(level,path,filename):
    new_line = "*"*level + " xref:" + path + filename + "[]\n"
    return new_line

def create_pure_navigation_adoc_file(fname,dname,created_files):
    created = False
    if not os.path.isfile(fname):
        created = True
        with open(fname,'w') as f:
            f.write("= "+dname.capitalize()+"\n\n== Subpages\n\n")

    if created:
        created_files.append(fname)

    return created


def initial_steps_performed_only_once(relative_path_depth,use_module,dirpath,base_level,nav_content,current_level,created_files,module,module_path,created):
    if relative_path_depth == -1:
        relative_path_depth = dirpath.count('\\')
        if use_module:
            split_path = dirpath.split("/")
            try:
                module = split_path[split_path.index("modules")+1]
                module_path = "/".join(split_path[:split_path.index("modules")+2])
            except:
                print("Module could not be determined: path does not contain '/module' element.")

            if module:
                base_level += 1
                # nav_content += "*"*current_level + " xref:" + module_path
                module_filename = module+".adoc"
                nav_content += add_xref(current_level,"",module_filename)
                created = create_pure_navigation_adoc_file(module_path+"/pages/"+module_filename,module,created_files)

    return relative_path_depth,base_level,nav_content,module,module_path,created


# TODO: Add append feature so that existing files are only appended, not skipped or overwritten (also: do this for the Subpages part in "create_pure_nvaigatoin_adoc_file!)
def add_subdirectories_to_main_file(created_files,main_file,list_entries,current_relative_path):
    content = []
    content_array = []
    for e in list_entries:
        line = " xref:" + current_relative_path.replace("\\","/") + e + "[]\n"
        content.append("*"+line)
        content_array.append(line)

    if main_file in created_files:
        with open(main_file,"a") as f:
                f.writelines(content)

    return content_array


def update_nav_adoc_file(path,nav_content):
    target = path[:path.rfind("/pages",1)]+"/"
    if os.path.isfile(target+"nav.adoc"):
        copyfile(target+"nav.adoc",target+"nav.adoc1")
    with open(target+"nav.adoc","w") as file:
        file.write(nav_content)


if __name__ == "__main__":
    main(sys.argv[1:])