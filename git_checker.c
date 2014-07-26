/**
 * Git Checker
 * Developed by Namyun Kim <skadvs@gmail.com>
 * This program developed using libgit2.
 */

#include "git_checker.h"

void interval_fetch_handler(int signum) {

    static int timer_count = 0;
    static char buf[GIT_OID_HEXSZ + 1] = {0};

    git_error_handler(git_remote_load(&remote, repo, "origin"));

    git_error_handler(git_remote_connect(remote, GIT_DIRECTION_FETCH));
    int connected = git_remote_connected(remote);

    const git_remote_head **remote_heads = NULL;
    
    size_t count = 0;
    size_t i = 0;
    if ((error = git_remote_ls(&remote_heads, &count, remote))<0) {
        return;
    }

    for (; i<count; ++i) {
        const git_remote_head *head = remote_heads[i];
        if(strstr(head->name,"HEAD")!=NULL) {
            git_oid oid;
            if ((error = git_reference_name_to_id(&oid, repo, "HEAD"))<0) {
                return;
            }

            git_commit *commit;
            if ((error = git_commit_lookup(&commit, repo, &oid))<0) {
                return;
            }

            const git_oid *commit_id = git_commit_id(commit);   // Get commit id
            git_oid_tostr(buf, sizeof(buf), commit_id);         // Convert heximal commit id to string

            fprintf(stdout, "Check ARLAM %d %s\n", ++timer_count, buf);
        }
    }
}

void git_error_handler(int error) {
    if (error<0) {
        const git_error *e = giterr_last();
        fprintf(stderr,"Error %d/%d: %s\n", error, e->klass, e->message);
        exit(-1);
    }
}

int main(int argc, char** argv) {
    struct sigaction sa;
    struct itimerval timer;

    if (argc != 3) {
        fprintf(stderr,"Usage: %s [path] [url]\n", argv[0]);
        return -1;
    }

    git_error_handler(git_clone(&repo, argv[2], argv[1], NULL));    

    

    // initialize timer
    memset(&sa,0,sizeof(sa));
    sa.sa_handler = &interval_fetch_handler;
    sigaction(SIGVTALRM,&sa,NULL);

    // set timer interval
    timer.it_value.tv_sec = 10;
    timer.it_value.tv_usec = 0;

    timer.it_interval.tv_sec = 10;
    timer.it_interval.tv_usec = 0;

    setitimer(ITIMER_VIRTUAL,&timer,NULL);

    while(1);

    return 0;
}